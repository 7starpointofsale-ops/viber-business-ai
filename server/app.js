const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// ADMIN PANEL
// =======================
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =======================
// LOAD DB
// =======================
function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

// =======================
// CLEAN INPUT (FIX ALL BUGS)
// =======================
function clean(msg) {
  return (msg || "")
    .replace(/[📁📄💰🧮📦]/g, "")
    .replace(/[^a-zA-Z0-9\u1000-\u109F\s]/g, "")
    .toLowerCase()
    .trim();
}

// =======================
// VIBER SEND
// =======================
async function send(userId, text, keyboard = null) {
  const body = {
    receiver: userId,
    type: "text",
    text
  };

  if (keyboard) body.keyboard = keyboard;

  try {
    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      body,
      {
        headers: {
          "X-Viber-Auth-Token": process.env.VIBER_TOKEN
        }
      }
    );
  } catch (e) {
    console.log("Viber Error:", e.message);
  }
}

// =======================
// KEYBOARD BUILDER
// =======================
function kb(items) {
  return {
    Type: "keyboard",
    Buttons: items.map(i => ({
      ActionType: "reply",
      ActionBody: i.value,
      Text: i.label,
      TextSize: "regular",
      Columns: 6,
      Rows: 1
    }))
  };
}

// =======================
// SERVICE MENU
// =======================
const SERVICE_MENU = [
  { label: "💰 ဈေးမေးမယ်", value: "service_price" },
  { label: "🧮 ဈေးတွက်မယ်", value: "service_calc" },
  { label: "📦 Order", value: "service_order" }
];

// =======================
// WEBHOOK
// =======================
app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.event !== "message") return res.sendStatus(200);

  const userId = body.sender.id;
  const rawMsg = body.message.text || "";
  const msg = clean(rawMsg);

  const db = loadDB();

  // =======================
  // START MENU
  // =======================
  if (["hi", "hello", "start", "menu", "မင်္ဂလာပါ"].includes(msg)) {
    await send(userId, "📦 7Star System\nSelect Service:", kb(SERVICE_MENU));
    return res.sendStatus(200);
  }

  // =======================
  // SERVICE SELECT
  // =======================
  if (msg.includes("ဈေးမေးမယ်") || msg === "service_price") {

    const cats = db.categories.map(c => ({
      label: `📁 ${c.name}`,
      value: clean(c.name)   // 🔥 FIX IMPORTANT
    }));

    await send(userId, "📁 Select Category", kb(cats));
    return res.sendStatus(200);
  }

  if (msg.includes("ဈေးတွက်မယ်") || msg === "service_calc") {
    await send(userId, "🧮 Send math (eg: 2+2)");
    return res.sendStatus(200);
  }

  if (msg.includes("order")) {
    await send(userId, "📦 Order system coming soon");
    return res.sendStatus(200);
  }

  // =======================
  // CATEGORY CLICK (FIX LOOP)
  // =======================
  const category = db.categories.find(c =>
    clean(c.name) === msg
  );

  if (category) {

    const items = category.items.map(i => ({
      label: `📄 ${i.item} ${i.size || ""} ${i.gsm || ""}`,
      value: i.id
    }));

    await send(userId, `📁 ${category.name}`, kb(items));
    return res.sendStatus(200);
  }

  // =======================
  // ITEM CLICK (FIXED)
  // =======================
  const item = db.categories
    .flatMap(c => c.items)
    .find(i => i.id === msg);

  if (item) {

    await send(
      userId,
`📄 ${item.item}

📏 Size: ${item.size || "-"}
📦 GSM: ${item.gsm || "-"}

💰 1 side: ${item.s1}
💰 2 side: ${item.s2}

👉 send: size qty (eg: 3x6 2)`
    );

    return res.sendStatus(200);
  }

  // =======================
  // CALCULATOR
  // =======================
  if (/^[0-9+\-*/().\s]+$/.test(msg)) {
    try {
      const r = eval(msg);
      await send(userId, `🧮 ${r}`);
    } catch {}
    return res.sendStatus(200);
  }

  // =======================
  // SIZE DETECT
  // =======================
  const size = msg.match(/(\d+)\s*[x*]\s*(\d+)/);
  const qty = msg.match(/(\d+)$/);

  if (size) {
    const q = qty ? Number(qty[1]) : 1;

    await send(
      userId,
`🧾 RESULT

📏 Size: ${size[1]}x${size[2]}
📦 Qty: ${q}`
    );

    return res.sendStatus(200);
  }

  // =======================
  // DEFAULT MENU
  // =======================
  await send(userId, "📦 Select Service", kb(SERVICE_MENU));

  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 V12 LOOP FIXED SYSTEM RUNNING");
});