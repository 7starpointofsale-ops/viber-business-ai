const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(express.json());

// =======================
// PATH
const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// CACHE SAFE
let DB_CACHE = null;

function loadDB() {
  try {
    DB_CACHE = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch (e) {
    DB_CACHE = { categories: [] };
  }
  return DB_CACHE;
}

function saveDB(data) {
  DB_CACHE = data;
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// auto refresh DB
setInterval(() => {
  try {
    DB_CACHE = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch (e) {}
}, 5000);

// =======================
// STATIC ADMIN
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =======================
// CLEAN
function clean(msg) {
  return (msg || "")
    .replace(/[📁📄💰🧮📦]/g, "")
    .replace(/\u200B/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

// =======================
// USER STATE
const userState = {};

// =======================
// VIBER SEND
async function send(userId, text, keyboard = null) {
  const body = {
    receiver: userId,
    type: "text",
    text
  };

  if (keyboard) body.keyboard = keyboard;

  await axios.post(
    "https://chatapi.viber.com/pa/send_message",
    body,
    {
      headers: {
        "X-Viber-Auth-Token": process.env.VIBER_TOKEN
      }
    }
  ).catch(() => {});
}

// =======================
// KEYBOARD
function kb(items) {
  return {
    Type: "keyboard",
    Buttons: items.map(i => ({
      ActionType: "reply",
      ActionBody: i.value,
      Text: i.label,
      Columns: 3,
      Rows: 1
    }))
  };
}

// =======================
// API - GET DB (ADMIN FIX)
app.get("/api/prices", (req, res) => {
  res.json(loadDB());
});

// =======================
// SAVE
app.post("/api/save-v2", (req, res) => {
  const db = loadDB();
  const b = req.body;

  let cat = db.categories.find(c => c.name === b.category);

  if (!cat) {
    cat = { name: b.category, items: [] };
    db.categories.push(cat);
  }

  cat.items.push({
    id: Date.now().toString(),
    item: b.item,
    size: b.size,
    gsm: b.gsm,
    s1: Number(b.s1 || 0),
    s2: Number(b.s2 || 0),
    lamination: b.lamination || "-",
    remark: b.remark || "-"
  });

  saveDB(db);
  res.json({ ok: true });
});

// =======================
// UPDATE PRICE
app.post("/api/update-entry", (req, res) => {
  const db = loadDB();
  const { id, price } = req.body;

  db.categories.forEach(c => {
    c.items.forEach(i => {
      if (i.id === id) {
        i.s1 = Number(price);
      }
    });
  });

  saveDB(db);
  res.json({ ok: true });
});

// =======================
// DELETE
app.post("/api/delete-entry", (req, res) => {
  const db = loadDB();
  const { id } = req.body;

  db.categories.forEach(c => {
    c.items = c.items.filter(i => i.id !== id);
  });

  saveDB(db);
  res.json({ ok: true });
});

// =======================
// VIBER BOT
app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.event !== "message") return res.sendStatus(200);

  const userId = body.sender.id;
  const msg = clean(body.message.text || "");
  const db = loadDB();

  // RESET
  if (["hi", "hello", "start", "menu", "မင်္ဂလာပါ"].includes(msg)) {
    userState[userId] = {};

    await send(userId,
      "📦 7Star System\nSelect Service:",
      kb([
        { label: "💰 ဈေးမေးမယ်", value: "service_price" },
        { label: "🧮 ဈေးတွက်မယ်", value: "service_calc" }
      ])
    );
    return res.sendStatus(200);
  }

  // MENU
  if (msg === "service_price" || msg === "service_calc") {
    userState[userId] = { mode: msg };

    const cats = db.categories.map((c, i) => ({
      label: `📁 ${c.name}`,
      value: `cat_${i}`
    }));

    await send(userId, "📁 Select Category", kb(cats));
    return res.sendStatus(200);
  }

  // CATEGORY
  if (msg.startsWith("cat_")) {
    const i = Number(msg.split("_")[1]);
    const cat = db.categories[i];
    if (!cat) return res.sendStatus(200);

    const items = cat.items.map((it, idx) => ({
      label: `📄 ${it.item} ${it.size}`,
      value: `item_${i}_${idx}`
    }));

    await send(userId, `📁 ${cat.name}`, kb(items));
    return res.sendStatus(200);
  }

  // ITEM
  if (msg.startsWith("item_")) {
    const p = msg.split("_");
    const item = db.categories[p[1]]?.items[p[2]];
    if (!item) return res.sendStatus(200);

    userState[userId] = {
      ...userState[userId],
      item
    };

    await send(userId,
`📄 ${item.item}
📏 ${item.size}
📦 ${item.gsm}

💰 1S: ${item.s1}
💰 2S: ${item.s2}`
    );

    return res.sendStatus(200);
  }

  // fallback
  await send(userId, "📦 Select Service", kb([
    { label: "💰 ဈေးမေးမယ်", value: "service_price" },
    { label: "🧮 ဈေးတွက်မယ်", value: "service_calc" }
  ]));

  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 FULL FIXED SYSTEM RUNNING");
});