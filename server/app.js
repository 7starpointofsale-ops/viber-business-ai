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
// CLEAN INPUT (FIX ALL BUGS)
// =======================
function clean(msg) {
  return (msg || "")
    .replace(/[📁📄💰🧮📦]/g, "")
    .toLowerCase()
    .trim();
}

// =======================
// SESSION (simple RAM)
const session = {};

// =======================
// KEYBOARD BUILDER
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
  const rawMsg = body.message.text;
  const msg = clean(rawMsg);

  const db = loadDB();

  // =======================
  // START MENU
  // =======================
  if (["hi", "hello", "menu", "start"].includes(msg)) {

    session[userId] = { step: "service" };

    await send(
      userId,
      "📦 7Star System\nSelect Service:",
      kb(SERVICE_MENU)
    );

    return res.sendStatus(200);
  }

  // =======================
  // SERVICE SELECT
  // =======================
  if (msg.includes("ဈေးမေးမယ်") || msg === "service_price") {

    session[userId] = { step: "category" };

    const cats = db.categories.map(c => ({
      label: `📁 ${c.name}`,
      value: `cat_${c.name}`
    }));

    await send(userId, "📁 Select Category", kb(cats));
    return res.sendStatus(200);
  }

  if (msg.includes("ဈေးတွက်မယ်") || msg === "service_calc") {
    session[userId] = { step: "calc" };
    await send(userId, "🧮 Send formula (eg: 2+2)");
    return res.sendStatus(200);
  }

  if (msg.includes("order") || msg === "service_order") {
    session[userId] = { step: "order" };
    await send(userId, "📦 Order system coming soon");
    return res.sendStatus(200);
  }

  // =======================
  // CATEGORY CLICK (FIXED SAFE MATCH)
  // =======================
  if (msg.startsWith("cat_") || msg.includes("digital press") || msg.includes("vinyl")) {

    let catName = msg.replace("cat_", "");

    const cat = db.categories.find(c =>
      c.name.toLowerCase() === catName.toLowerCase()
    );

    if (!cat) {
      await send(userId, "❌ Category not found");
      return res.sendStatus(200);
    }

    const items = cat.items.map(i => ({
      label: `📄 ${i.item} ${i.size || ""} ${i.gsm || ""}`,
      value: `item_${i.id}`
    }));

    await send(userId, `📁 ${cat.name}`, kb(items));
    return res.sendStatus(200);
  }

  // =======================
  // ITEM CLICK (SAFE ID MATCH)
  // =======================
  if (msg.startsWith("item_")) {

    const id = msg.replace("item_", "");
    let found = null;

    db.categories.forEach(c => {
      c.items.forEach(i => {
        if (i.id === id) found = i;
      });
    });

    if (!found) {
      await send(userId, "❌ Item not found");
      return res.sendStatus(200);
    }

    await send(
      userId,
`📄 ${found.item}

📏 Size: ${found.size || "-"}
📦 GSM: ${found.gsm || "-"}

💰 1 side: ${found.s1}
💰 2 side: ${found.s2}

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
  // SIZE CALC
  // =======================
  const size = msg.match(/(\d+)\s*[x*]\s*(\d+)/);
  const qty = msg.match(/(\d+)$/);

  if (size) {
    const q = qty ? Number(qty[1]) : 1;
    const area = Number(size[1]) * Number(size[2]);

    await send(
      userId,
`🧾 RESULT

📏 Size: ${size[1]}x${size[2]}
📦 Qty: ${q}
🧮 Area: ${area}

💡 pricing engine next`
    );

    return res.sendStatus(200);
  }

  // =======================
  // DEFAULT MENU (SAFE)
  // =======================
  await send(
    userId,
    "📦 Select Service",
    kb(SERVICE_MENU)
  );

  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 V12 STABLE FULL SYSTEM RUNNING");
});