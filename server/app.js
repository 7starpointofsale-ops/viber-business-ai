const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// =======================================
// PATH SAFE
// =======================================
const DB_PATH = path.join(__dirname, "../database/price.db.json");
const ORDER_DB = path.join(__dirname, "../database/orders.db.json");

app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =======================================
// SAFE FILE INIT
// =======================================
function ensureFile(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }
}

ensureFile(DB_PATH, { categories: [] });
ensureFile(ORDER_DB, { orders: [] });

// =======================================
// CACHE
// =======================================
let dbCache = null;
let lastLoad = 0;

function loadDB() {
  try {
    const now = Date.now();
    if (dbCache && now - lastLoad < 3000) return dbCache;

    dbCache = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    lastLoad = now;

    if (!dbCache.categories) dbCache.categories = [];

    return dbCache;
  } catch (e) {
    return { categories: [] };
  }
}

function saveDB(data) {
  dbCache = data;
  lastLoad = Date.now();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function loadOrders() {
  try {
    return JSON.parse(fs.readFileSync(ORDER_DB, "utf8"));
  } catch {
    return { orders: [] };
  }
}

function saveOrders(data) {
  fs.writeFileSync(ORDER_DB, JSON.stringify(data, null, 2));
}

// =======================================
// CLEAN
// =======================================
function clean(msg = "") {
  return msg
    .replace(/[📁📄💰🧮📦🧾]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

// =======================================
// NUMBER NORMALIZE
// =======================================
function normalizeNumber(msg = "") {
  const map = {
    "၀": "0","၁":"1","၂":"2","၃":"3","၄":"4",
    "၅":"5","၆":"6","၇":"7","၈":"8","၉":"9"
  };

  return msg.split("").map(c => map[c] ?? c).join("");
}

function isNumber(msg) {
  return /^\d+$/.test(normalizeNumber(msg));
}

// =======================================
function safe(v) {
  return (v === undefined || v === null || v === "") ? "-" : v;
}

function formatPrice(n) {
  return Number(n || 0).toLocaleString();
}

// =======================================
// STATE
// =======================================
const userState = {};

// =======================================
// COMMANDS
// =======================================
const SERVICE_MENU = [
  { label: "💰 ဈေးမေးမယ်", value: "service_price" },
  { label: "🧮 ဈေးတွက်မယ်", value: "service_calc" }
];

const commandMap = {
  "ဈေးတွက်မယ်": "service_calc",
  "ဈေးမေးမယ်": "service_price",
  "calc": "service_calc",
  "price": "service_price"
};

const ignoreMsgs = [".","home","back","menu","start"];

// =======================================
// VIBER SEND (SAFE)
// =======================================
async function send(userId, text, keyboard = null) {
  try {
    const body = {
      receiver: userId,
      type: "text",
      text,
      min_api_version: 7
    };

    if (keyboard) body.keyboard = keyboard;

    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      body,
      {
        timeout: 10000,
        headers: {
          "X-Viber-Auth-Token": process.env.VIBER_TOKEN
        }
      }
    );
  } catch (e) {
    console.log("Viber Error:", e.message);
  }
}

// =======================================
// KEYBOARD
// =======================================
function kb(items) {
  return {
    Type: "keyboard",
    DefaultHeight: false,
    Buttons: items.map(i => ({
      Columns: 3,
      Rows: 1,
      BgColor: "#2d3748",
      ActionType: "reply",
      ActionBody: i.value,
      Text: `<font color="#ffffff">${i.label}</font>`
    }))
  };
}

// =======================================
// SMART SEARCH
// =======================================
function findItemSmart(db, msg) {
  if (!db?.categories) return null;

  let best = null;
  let bestScore = 0;
  const tokens = msg.split(" ");

  db.categories.forEach(c => {
    (c.items || []).forEach(i => {

      let score = 0;
      const name = (i.item || "").toLowerCase();
      const size = (i.size || "").toLowerCase();
      const gsm = (i.gsm || "").toLowerCase();

      tokens.forEach(t => {
        if (name.includes(t)) score += 5;
        if (size.includes(t)) score += 3;
        if (gsm.includes(t)) score += 2;
      });

      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
  });

  return best;
}

// =======================================
// WEBHOOK
// =======================================
app.post("/webhook", async (req, res) => {
  try {

    const body = req.body;
    if (body.event !== "message") return res.sendStatus(200);

    const userId = body.sender.id;
    let msg = clean(body.message.text || "");
    msg = commandMap[msg] || msg;
    msg = normalizeNumber(msg);

    const db = loadDB();
    const state = userState[userId];

    // RESET
    if (ignoreMsgs.includes(msg)) {
      delete userState[userId];
      await send(userId, "📦 7Star System", kb(SERVICE_MENU));
      return res.sendStatus(200);
    }

    // MENU
    if (["hi","hello","start","menu","မင်္ဂလာပါ"].includes(msg)) {
      await send(userId, "📦 7Star System", kb(SERVICE_MENU));
      return res.sendStatus(200);
    }

    // PRICE
    if (msg === "service_price") {
      const cats = (db.categories || []).map((c,i)=>({
        label:`📁 ${c.name}`, value:`cat_${i}`
      }));
      return send(userId, "📁 Category", kb(cats));
    }

    // CALC
    if (msg === "service_calc") {
      userState[userId] = { mode:"calc" };

      const cats = (db.categories || []).map((c,i)=>({
        label:`📁 ${c.name}`, value:`cat_${i}`
      }));

      return send(userId, "🧮 Category", kb(cats));
    }

    // CATEGORY
    if (msg.startsWith("cat_")) {
      const i = Number(msg.split("_")[1]);
      const cat = db.categories?.[i];

      if (!cat) return res.sendStatus(200);

      const items = (cat.items || []).map((it,idx)=>({
        label:`📄 ${it.item}`,
        value:`item_${i}_${idx}`
      }));

      return send(userId, cat.name, kb(items));
    }

    // ITEM
    if (msg.startsWith("item_")) {
      const [_, cIdx, iIdx] = msg.split("_");
      const item = db.categories?.[cIdx]?.items?.[iIdx];

      if (!item) return res.sendStatus(200);

      if (state?.mode === "calc") {
        userState[userId] = { mode:"qty", item };
        return send(userId, `📄 ${item.item}\nQty?`);
      }

      let text =
`📄 ${item.item}
📏 ${safe(item.size)}
📦 ${safe(item.gsm)}
💰 ${item.noSide ? formatPrice(item.s1) : `${item.s1} / ${item.s2}`}`;

      return send(userId, text);
    }

    // QTY
    if (state?.mode === "qty") {
      if (!isNumber(msg)) return send(userId, "Number only");

      const qty = Number(normalizeNumber(msg));
      const total = Number(state.item.s1 || 0) * qty;

      delete userState[userId];

      return send(userId,
`📦 RESULT
📄 ${state.item.item}
Qty: ${qty}
💰 ${formatPrice(total)} Ks`);
    }

    // SMART SEARCH
    if (!state) {
      const item = findItemSmart(db, msg);

      if (item) {
        return send(userId,
`📄 ${item.item}
📏 ${safe(item.size)}`);
      }
    }

    return send(userId, "📦 Select Service", kb(SERVICE_MENU));

  } catch (e) {
    console.log(e);
    return res.sendStatus(200);
  }
});

// =======================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 SYSTEM RUNNING ON", PORT);
});