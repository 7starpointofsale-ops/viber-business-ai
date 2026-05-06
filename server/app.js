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

setInterval(() => {
  try {
    DB_CACHE = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch (e) {}
}, 10000);

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
function formatSize(size) {
  if (!size) return "";
  return String(size).replace(/\s+/g, " ").trim();
}

// =======================
const userState = {};

// =======================
async function send(userId, text, keyboard = null) {
  const body = { receiver: userId, type: "text", text };

  if (keyboard) body.keyboard = keyboard;

  axios.post(
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
const SERVICE_MENU = [
  { label: "💰 ဈေးမေးမယ်", value: "service_price" },
  { label: "🧮 ဈေးတွက်မယ်", value: "service_calc" }
];

// =======================
function sideKb() {
  return kb([
    { label: "1️⃣ One Side", value: "side_1" },
    { label: "2️⃣ Two Side", value: "side_2" }
  ]);
}

// =======================
app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.event !== "message") return res.sendStatus(200);

  const userId = body.sender.id;
  const msg = clean(body.message.text || "");
  const db = loadDB();

  // =======================
  if (["hi", "hello", "start", "menu", "မင်္ဂလာပါ"].includes(msg)) {
    userState[userId] = { mode: null };

    await send(userId, "📦 7Star System\nSelect Service:", kb(SERVICE_MENU));
    return res.sendStatus(200);
  }

  // =======================
  if (msg === "service_price") {
    const cats = db.categories.map((c, i) => ({
      label: `📁 ${c.name}`,
      value: `cat_${i}`
    }));

    await send(userId, "📁 Select Category", kb(cats));
    return res.sendStatus(200);
  }

  // =======================
  if (msg === "service_calc") {
    userState[userId] = { mode: "calc", item: null, qty: 1 };

    const cats = db.categories.map((c, i) => ({
      label: `📁 ${c.name}`,
      value: `cat_${i}`
    }));

    await send(userId, "🧮 Select Category", kb(cats));
    return res.sendStatus(200);
  }

  // =======================
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

  // =======================
  if (msg.startsWith("item_")) {
    const p = msg.split("_");
    const item = db.categories[p[1]]?.items[p[2]];
    if (!item) return res.sendStatus(200);

    const state = userState[userId] || {};
    userState[userId] = { ...state, item };

    const sizeText = formatSize(item.size);

    // CALC MODE
    if (state.mode === "calc") {
      userState[userId].step = "side";

      await send(
        userId,
`📄 ${item.item}
📏 ${sizeText}
📦 ${item.gsm}

🧮 Select Side`
        ,
        sideKb()
      );
      return res.sendStatus(200);
    }

    await send(
      userId,
`📄 ${item.item}
📏 ${sizeText}
📦 ${item.gsm}

👉 Use "ဈေးတွက်မယ်"`
    );

    return res.sendStatus(200);
  }

  // =======================
  if (msg === "side_1" || msg === "side_2") {
    const state = userState[userId];
    if (!state?.item) return res.sendStatus(200);

    const side = msg === "side_2" ? 2 : 1;

    userState[userId].side = side;
    userState[userId].step = "qty";

    await send(userId, "📦 Enter Qty:");
    return res.sendStatus(200);
  }

  // =======================
  // QTY INPUT (FIXED FLOW)
  if (userState[userId]?.step === "qty") {
    const qty = Number(msg);
    if (!qty) {
      await send(userId, "❌ number only");
      return res.sendStatus(200);
    }

    const state = userState[userId];

    const price = state.side === 2 ? state.item.s2 : state.item.s1;
    const total = price * qty;

    await send(userId,
`🧾 RESULT

📄 ${state.item.item}
🧾 ${state.side} Side
📦 ${qty} pcs

💰 Total: ${total} Ks`
    );

    delete userState[userId];
    return res.sendStatus(200);
  }

  // =======================
  await send(userId, "📦 Select Service", kb(SERVICE_MENU));
  res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 STABLE V2 POS BOT RUNNING");
});