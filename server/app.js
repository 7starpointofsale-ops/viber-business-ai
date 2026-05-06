const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// DB CACHE
let DB_CACHE = null;

function loadDB() {
  if (!DB_CACHE) {
    DB_CACHE = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  }
  return DB_CACHE;
}

function saveDB(data) {
  DB_CACHE = data;
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// =======================
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =======================
function clean(msg) {
  return (msg || "")
    .replace(/[📁📄💰🧮📦]/g, "")
    .replace(/\u200B/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

// =======================
const userState = {};

// =======================
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
app.post("/api/prices", (req, res) => {
  res.json(loadDB());
});

// =======================
// SAVE NEW ITEM
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
    s1: Number(b.s1),
    s2: Number(b.s2),
    lamination: b.lamination,
    remark: b.remark
  });

  saveDB(db);
  res.json({ ok: true });
});

// =======================
// UPDATE PRICE
app.post("/api/update-entry", (req, res) => {
  const db = loadDB();
  const { id, price } = req.body;

  for (const c of db.categories) {
    for (const i of c.items) {
      if (i.id === id) {
        i.s1 = Number(price);
      }
    }
  }

  saveDB(db);
  res.json({ ok: true });
});

// =======================
// DELETE ITEM
app.post("/api/delete-entry", (req, res) => {
  const db = loadDB();
  const { id } = req.body;

  for (const c of db.categories) {
    c.items = c.items.filter(i => i.id !== id);
  }

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

  if (["hi", "hello", "start", "menu", "မင်္ဂလာပါ"].includes(msg)) {
    userState[userId] = {};
    await send(userId, "📦 7Star System\nSelect Service:", kb([
      { label: "💰 ဈေးမေးမယ်", value: "service_price" },
      { label: "🧮 ဈေးတွက်မယ်", value: "service_calc" }
    ]));
    return res.sendStatus(200);
  }

  if (msg === "service_price" || msg === "service_calc") {
    userState[userId] = { mode: msg };

    const cats = db.categories.map((c, i) => ({
      label: `📁 ${c.name}`,
      value: `cat_${i}`
    }));

    await send(userId, "📁 Select Category", kb(cats));
    return res.sendStatus(200);
  }

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

  if (msg.startsWith("item_")) {
    const p = msg.split("_");
    const item = db.categories[p[1]]?.items[p[2]];
    if (!item) return res.sendStatus(200);

    const state = userState[userId] || {};
    userState[userId] = { ...state, item };

    await send(userId,
`📄 ${item.item}
📏 ${item.size}
📦 ${item.gsm}

💰 1S: ${item.s1}
💰 2S: ${item.s2}`);
    return res.sendStatus(200);
  }

  await send(userId, "📦 Select Service", kb([
    { label: "💰 ဈေးမေးမယ်", value: "service_price" },
    { label: "🧮 ဈေးတွက်မယ်", value: "service_calc" }
  ]));

  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 FULL SYSTEM READY");
});