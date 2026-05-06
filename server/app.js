const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// ADMIN STATIC
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
// BUILD BUTTON GRID (FROM DB ONLY)
// =======================
function buildKeyboard(items) {
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
// NORMALIZE
// =======================
function norm(msg) {
  return (msg || "").toLowerCase().trim();
}

// =======================
// WEBHOOK
// =======================
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.event !== "message") return res.sendStatus(200);

  const userId = body.sender.id;
  const msg = norm(body.message.text);

  const db = loadDB();

  // =======================
  // START MENU (FROM DB ONLY)
  // =======================
  if (["hi", "hello", "menu"].includes(msg)) {

    const cats = db.categories.map(c => ({
      label: `📁 ${c.name}`,
      value: `cat_${c.name}`
    }));

    await send(userId, "📦 Select Category", buildKeyboard(cats));
    return res.sendStatus(200);
  }

  // =======================
  // CATEGORY CLICK (FIXED)
  // =======================
  if (msg.startsWith("cat_")) {

    const catName = msg.replace("cat_", "");

    const cat = db.categories.find(c => c.name === catName);

    if (!cat) {
      await send(userId, "❌ Category not found");
      return res.sendStatus(200);
    }

    const items = cat.items.map(i => ({
      label: `📄 ${i.item} ${i.size} ${i.gsm || ""}`,
      value: `item_${i.id}`
    }));

    await send(userId, `📁 ${cat.name}`, buildKeyboard(items));
    return res.sendStatus(200);
  }

  // =======================
  // ITEM CLICK (FIXED SAFE MATCH)
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
      await send(userId, "❌ Item not found (DB mismatch)");
      return res.sendStatus(200);
    }

    await send(
      userId,
`📄 ${found.item}

📏 Size: ${found.size}
📦 GSM: ${found.gsm}

💰 1 side: ${found.s1}
💰 2 side: ${found.s2}

👉 Send: size qty (eg: 3x6 2)`
    );

    return res.sendStatus(200);
  }

  // =======================
  // SIZE CALC (SAFE SIMPLE)
  // =======================
  const size = msg.match(/(\d+)\s*[x*]\s*(\d+)/);
  const qty = msg.match(/(\d+)$/);

  if (size) {
    const q = qty ? Number(qty[1]) : 1;
    const area = Number(size[1]) * Number(size[2]);

    await send(
      userId,
`🧾 RESULT

📏 ${size[1]}x${size[2]}
📦 Qty: ${q}
🧮 Area: ${area}

💡 (pricing engine next step)`
    );

    return res.sendStatus(200);
  }

  // =======================
  // DEFAULT
  // =======================
  const cats = db.categories.map(c => ({
    label: `📁 ${c.name}`,
    value: `cat_${c.name}`
  }));

  await send(userId, "📌 Select Category", buildKeyboard(cats));

  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 V10 FIXED DB-SYNC RUNNING");
});