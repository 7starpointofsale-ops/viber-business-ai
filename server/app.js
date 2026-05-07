const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const DB_PATH = path.join(__dirname, "../database/price.db.json");
const ORDER_DB = path.join(__dirname, "../database/orders.db.json");

app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =======================================
// FAST CACHE
// =======================================
let dbCache = null;
let lastLoad = 0;

function loadDB() {
  const now = Date.now();

  if (dbCache && now - lastLoad < 3000) {
    return dbCache;
  }

  dbCache = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  lastLoad = now;

  return dbCache;
}

function saveDB(data) {
  dbCache = data;
  lastLoad = Date.now();

  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function loadOrders() {
  return JSON.parse(fs.readFileSync(ORDER_DB, "utf8"));
}

function saveOrders(data) {
  fs.writeFileSync(ORDER_DB, JSON.stringify(data, null, 2));
}

// =======================================
// CLEAN
// =======================================
function clean(msg) {
  return (msg || "")
    .replace(/[📁📄💰🧮📦🧾]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

// =======================================
// BURMESE NUMBER
// =======================================
function normalizeNumber(msg) {
  const map = {
    "၀": "0",
    "၁": "1",
    "၂": "2",
    "၃": "3",
    "၄": "4",
    "၅": "5",
    "၆": "6",
    "၇": "7",
    "၈": "8",
    "၉": "9"
  };

  return (msg || "")
    .split("")
    .map(c => map[c] ?? c)
    .join("");
}

function isNumber(msg) {
  return /^\d+$/.test(normalizeNumber(msg));
}

// =======================================
function safe(v) {
  if (v === undefined || v === null || v === "" || v === "-") {
    return "-";
  }

  return v;
}

function formatPrice(n) {
  return Number(n || 0).toLocaleString();
}

// =======================================
// COMMANDS
// =======================================
const commandMap = {
  "ဈေးတွက်မယ်": "service_calc",
  "ဈေးမေးမယ်": "service_price",
  "calc": "service_calc",
  "price": "service_price"
};

const ignoreMsgs = [
  ".",
  "home",
  "back",
  "menu",
  "start"
];

// =======================================
const SERVICE_MENU = [
  { label: "💰 ဈေးမေးမယ်", value: "service_price" },
  { label: "🧮 ဈေးတွက်မယ်", value: "service_calc" }
];

// =======================================
const userState = {};

// =======================================
// SEND
// =======================================
async function send(userId, text, keyboard = null) {
  const body = {
    receiver: userId,
    type: "text",
    text,
    min_api_version: 7
  };

  if (keyboard) {
    body.keyboard = keyboard;
  }

  try {
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
  let best = null;
  let bestScore = 0;

  const tokens = msg.split(/\s+/);

  db.categories.forEach(c => {
    c.items.forEach(i => {

      let score = 0;

      const name = String(i.item || "").toLowerCase();
      const size = String(i.size || "").toLowerCase();
      const gsm = String(i.gsm || "").toLowerCase();

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
// API
// =======================================
app.get("/api/prices", (req, res) => {
  res.json(loadDB());
});

// =======================================
// SAVE
// =======================================
app.post("/api/save-v2", (req, res) => {

  const {
    category,
    item,
    size,
    gsm,
    s1,
    s2,
    lamination,
    remark,
    noSide
  } = req.body;

  const db = loadDB();

  let cat = db.categories.find(
    c => c.name.toLowerCase() === String(category).toLowerCase()
  );

  if (!cat) {
    cat = {
      name: category,
      items: []
    };

    db.categories.push(cat);
  }

  cat.items.push({
    id: Date.now().toString(),
    item,
    size,
    gsm,
    s1: Number(s1 || 0),
    s2: Number(s2 || 0),
    lamination,
    remark,
    noSide: !!noSide
  });

  saveDB(db);

  res.json({
    ok: true
  });
});

// =======================================
// UPDATE
// =======================================
app.post("/api/update-entry", (req, res) => {

  const {
    id,
    field,
    value
  } = req.body;

  const db = loadDB();

  db.categories.forEach(c => {
    c.items.forEach(i => {

      const itemId = i.id || "";

      if (itemId === id) {

        if (["s1", "s2"].includes(field)) {
          i[field] = Number(value || 0);
        } else {
          i[field] = value;
        }

      }
    });
  });

  saveDB(db);

  res.json({
    ok: true
  });
});

// =======================================
// DELETE
// =======================================
app.post("/api/delete-entry", (req, res) => {

  const { id } = req.body;

  const db = loadDB();

  db.categories.forEach(c => {
    c.items = c.items.filter(i => i.id !== id);
  });

  saveDB(db);

  res.json({
    ok: true
  });
});

// =======================================
// ORDERS
// =======================================
app.get("/api/orders", (req, res) => {
  res.json(loadOrders());
});

app.post("/api/update-status", (req, res) => {

  const { id, status } = req.body;

  const db = loadOrders();

  db.orders.forEach(o => {
    if (o.id === id) {
      o.status = status;
    }
  });

  saveOrders(db);

  res.json({
    ok: true
  });
});

// =======================================
// WEBHOOK
// =======================================
app.post("/webhook", async (req, res) => {

  try {

    const body = req.body;

    if (body.event !== "message") {
      return res.sendStatus(200);
    }

    const userId = body.sender.id;

    let rawMsg = body.message.text || "";

    let msg = clean(rawMsg);

    msg = commandMap[msg] || msg;

    msg = normalizeNumber(msg);

    const db = loadDB();

    const state = userState[userId];

    // ===================================
    // RESET
    // ===================================
    if (ignoreMsgs.includes(msg)) {

      delete userState[userId];

      await send(
        userId,
        "📦 7Star System\nSelect Service:",
        kb(SERVICE_MENU)
      );

      return res.sendStatus(200);
    }

    // ===================================
    // MENU
    // ===================================
    if ([
      "hi",
      "hello",
      "start",
      "menu",
      "မင်္ဂလာပါ"
    ].includes(msg)) {

      await send(
        userId,
        "📦 7Star System\nSelect Service:",
        kb(SERVICE_MENU)
      );

      return res.sendStatus(200);
    }

    // ===================================
    // PRICE
    // ===================================
    if (msg === "service_price") {

      const cats = db.categories.map((c, i) => ({
        label: `📁 ${c.name}`,
        value: `cat_${i}`
      }));

      await send(userId, "📁 Select Category", kb(cats));

      return res.sendStatus(200);
    }

    // ===================================
    // CALC
    // ===================================
    if (msg === "service_calc") {

      userState[userId] = {
        mode: "calc"
      };

      const cats = db.categories.map((c, i) => ({
        label: `📁 ${c.name}`,
        value: `cat_${i}`
      }));

      await send(userId, "🧮 Select Category", kb(cats));

      return res.sendStatus(200);
    }

    // ===================================
    // CATEGORY
    // ===================================
    if (msg.startsWith("cat_")) {

      const index = Number(msg.replace("cat_", ""));

      const category = db.categories[index];

      const items = category.items.map((i, idx) => ({
        label: `📄 ${i.item}`,
        value: `item_${index}_${idx}`
      }));

      await send(userId, `📁 ${category.name}`, kb(items));

      return res.sendStatus(200);
    }

    // ===================================
    // ITEM
    // ===================================
    if (msg.startsWith("item_")) {

      const parts = msg.split("_");

      const item = db.categories[parts[1]]?.items[parts[2]];

      if (!item) {
        return res.sendStatus(200);
      }

      // CALC MODE
      if (state?.mode === "calc") {

        userState[userId] = {
          mode: "calc_qty",
          item
        };

        await send(
          userId,
`📄 ${item.item}
📏 ${safe(item.size)}
📦 ${safe(item.gsm)}

👉 Qty ဘယ်လောက်?`
        );

        return res.sendStatus(200);
      }

      // PRICE MODE
      let text =
`📄 ${item.item}

📏 ${safe(item.size)}
📦 ${safe(item.gsm)}`;

      if (item.noSide) {

        text += `

💰 Price: ${formatPrice(item.s1)} Ks`;

      } else {

        text += `

💰 1 Side: ${formatPrice(item.s1)} Ks
💰 2 Side: ${formatPrice(item.s2)} Ks`;
      }

      await send(userId, text);

      return res.sendStatus(200);
    }

    // ===================================
    // QTY
    // ===================================
    if (state?.mode === "calc_qty") {

      if (!isNumber(msg)) {

        await send(
          userId,
          "❌ Number only (eg: 100)"
        );

        return res.sendStatus(200);
      }

      const qty = Number(normalizeNumber(msg));

      // NO SIDE MODE
      if (state.item.noSide) {

        const total = Number(state.item.s1 || 0) * qty;

        await send(
          userId,
`🧾 RESULT

📄 ${state.item.item}
📏 ${safe(state.item.size)}

📦 Qty: ${qty}

💰 Total: ${formatPrice(total)} Ks`
        );

        delete userState[userId];

        return res.sendStatus(200);
      }

      userState[userId] = {
        mode: "calc_side",
        item: state.item,
        qty
      };

      await send(
        userId,
`🧾 Select Side

📦 Qty: ${qty}`,
        kb([
          { label: "1️⃣ 1 Side", value: "side_1" },
          { label: "2️⃣ 2 Side", value: "side_2" }
        ])
      );

      return res.sendStatus(200);
    }

    // ===================================
    // SIDE
    // ===================================
    if (
      msg === "side_1" ||
      msg === "side_2"
    ) {

      if (!state || state.mode !== "calc_side") {
        return res.sendStatus(200);
      }

      const item = state.item;

      const qty = state.qty;

      const side = msg === "side_2" ? 2 : 1;

      const price = side === 2
        ? Number(item.s2 || 0)
        : Number(item.s1 || 0);

      const total = price * qty;

      await send(
        userId,
`🧾 RESULT

📄 ${item.item}
📏 ${safe(item.size)}
📦 ${safe(item.gsm)}

🧾 ${side} Side
📦 Qty: ${qty}

💰 Total: ${formatPrice(total)} Ks`
      );

      delete userState[userId];

      return res.sendStatus(200);
    }

    // ===================================
    // SMART SEARCH
    // ===================================
    if (!state) {

      const item = findItemSmart(db, msg);

      if (item) {

        await send(
          userId,
`📄 ${item.item}

📏 ${safe(item.size)}
📦 ${safe(item.gsm)}

👉 Select from menu for calculation`
        );

        return res.sendStatus(200);
      }
    }

    // ===================================
    await send(
      userId,
      "📦 Select Service",
      kb(SERVICE_MENU)
    );

    return res.sendStatus(200);

  } catch (e) {

    console.log(e);

    return res.sendStatus(200);
  }
});

// =======================================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 7Star Production Server Running");
});