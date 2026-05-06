const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// SPEED FIX 🚀 (CACHE DB)
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
// CLEAN INPUT
function clean(msg) {
  return (msg || "")
    .replace(/[📁📄💰🧮📦]/g, "")
    .toLowerCase()
    .trim();
}

// =======================
// 🔥 FIX A4 A4 + DUPLICATE WORDS
function formatSize(size) {
  if (!size) return "";

  let s = String(size).trim();

  // normalize multiple spaces
  s = s.replace(/\s+/g, " ");

  // split words
  let parts = s.split(" ");

  // remove duplicate consecutive words (A4 A4 fix)
  let result = [];
  for (let p of parts) {
    if (result[result.length - 1] !== p) {
      result.push(p);
    }
  }

  return result.join(" ");
}

// =======================
const userState = {};

// =======================
// FAST SEND
async function send(userId, text, keyboard = null) {
  const body = {
    receiver: userId,
    type: "text",
    text
  };

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
function quickKb() {
  return kb([
    { label: "1️⃣ 1S 50", value: "q_1_50" },
    { label: "2️⃣ 1S 100", value: "q_1_100" },
    { label: "3️⃣ 2S 50", value: "q_2_50" },
    { label: "4️⃣ 2S 100", value: "q_2_100" },
    { label: "✏️ Custom", value: "q_custom" }
  ]);
}

// =======================
app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.event !== "message") return res.sendStatus(200);

  const userId = body.sender.id;
  const rawMsg = body.message.text || "";
  const msg = clean(rawMsg);

  const db = loadDB();

  // =======================
  if (["hi", "hello", "start", "menu", "မင်္ဂလာပါ"].includes(msg)) {
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
    userState[userId] = { mode: "calc" };

    const cats = db.categories.map((c, i) => ({
      label: `📁 ${c.name}`,
      value: `cat_${i}`
    }));

    await send(userId, "🧮 Select Category", kb(cats));
    return res.sendStatus(200);
  }

  // =======================
  if (msg.startsWith("cat_")) {
    const index = Number(msg.replace("cat_", ""));
    const category = db.categories[index];

    if (!category) return res.sendStatus(200);

    const items = category.items.map((i, idx) => ({
      label: `📄 ${i.item} ${i.size} ${i.gsm}`,
      value: `item_${index}_${idx}`
    }));

    await send(userId, `📁 ${category.name}`, kb(items));
    return res.sendStatus(200);
  }

  // =======================
  if (msg.startsWith("item_")) {
    const parts = msg.split("_");
    const item = db.categories[parts[1]]?.items[parts[2]];

    if (!item) return res.sendStatus(200);

    const state = userState[userId];
    const sizeText = formatSize(item.size);

    if (state?.mode === "calc") {
      userState[userId] = {
        mode: "quick",
        item
      };

      await send(
        userId,
`📄 ${item.item}
📏 ${sizeText}
📦 ${item.gsm}g

📦 Quick Select (1 tap fast)`,
        quickKb()
      );

      return res.sendStatus(200);
    }

    await send(
      userId,
`📄 ${item.item}

📏 Size: ${sizeText}
📦 GSM: ${item.gsm}g

💰 1 side: ${item.s1}
💰 2 side: ${item.s2}`
    );

    return res.sendStatus(200);
  }

  // =======================
  // QUICK MODE
  if (msg.startsWith("q_")) {
    const state = userState[userId];
    if (!state?.item) return res.sendStatus(200);

    if (msg === "q_custom") {
      userState[userId].mode = "custom_qty";
      await send(userId, "📦 Enter Qty:");
      return res.sendStatus(200);
    }

    const parts = msg.split("_");
    const side = Number(parts[1]);
    const qty = Number(parts[2]);

    if (!qty) return send(userId, "❌ number only");

    const price = side === 2 ? state.item.s2 : state.item.s1;
    const total = price * qty;

    const sizeText = formatSize(state.item.size);

    await send(
      userId,
`🧾 RESULT

📄 ${state.item.item}
📏 ${sizeText}
📦 ${state.item.gsm}g
🧾 ${side} Side
📦 ${qty} pcs

💰 Total: ${total} Ks`
    );

    delete userState[userId];
    return res.sendStatus(200);
  }

  // =======================
  // CUSTOM QTY SAFE MODE
  if (userState[userId]?.mode === "custom_qty") {
    const qty = Number(msg);

    if (!qty) {
      if (msg === "back") {
        delete userState[userId];
        await send(userId, "📦 Select again");
        return res.sendStatus(200);
      }

      await send(userId, "❌ number only");
      return res.sendStatus(200);
    }

    userState[userId].qty = qty;
    userState[userId].mode = "custom_side";

    await send(userId, "🧾 Select Side\n1️⃣ One Side\n2️⃣ Two Side");
    return res.sendStatus(200);
  }

  if (msg === "side_1" || msg === "side_2") {
    const state = userState[userId];
    if (!state || state.mode !== "custom_side") return res.sendStatus(200);

    const side = msg === "side_2" ? 2 : 1;
    const qty = state.qty;

    const price = side === 2 ? state.item.s2 : state.item.s1;
    const total = price * qty;

    const sizeText = formatSize(state.item.size);

    await send(
      userId,
`🧾 RESULT

📄 ${state.item.item}
📏 ${sizeText}
📦 ${state.item.gsm}g
🧾 ${side} Side
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

// =======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 FIXED STABLE BOT RUNNING");
});