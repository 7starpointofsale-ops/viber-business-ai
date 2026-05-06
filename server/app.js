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
// SAVE DB
// =======================
function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
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

  if (keyboard) {
    body.keyboard = keyboard;
  }

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
// BUTTON BUILDER (GRID 2 COLUMN)
// =======================
function buildKeyboard(items) {
  const buttons = items.map(i => ({
    ActionType: "reply",
    ActionBody: i.value,
    Text: i.label,
    TextSize: "regular",
    Columns: 6,
    Rows: 1
  }));

  return {
    Type: "keyboard",
    Buttons: buttons
  };
}

// =======================
// MENU DATA (STATIC FLOW)
// =======================
const MENU = {
  start: [
    { label: "📁 Digital", value: "menu_digital" },
    { label: "📁 Vinyl", value: "menu_vinyl" },
    { label: "📁 Card", value: "menu_card" },
    { label: "📁 Fixed", value: "menu_fixed" }
  ]
};

// =======================
// NORMALIZE
// =======================
function normalize(msg) {
  return (msg || "").toLowerCase().trim();
}

// =======================
// WEBHOOK
// =======================
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.event !== "message") return res.sendStatus(200);

  const userId = body.sender.id;
  let msg = normalize(body.message.text);

  const db = loadDB();

  // =======================
  // START MENU
  // =======================
  if (["hi", "hello", "menu"].includes(msg)) {
    await send(
      userId,
      "📦 7Star System\nSelect Category:",
      buildKeyboard(MENU.start)
    );
    return res.sendStatus(200);
  }

  // =======================
  // CATEGORY ROUTE
  // =======================
  if (msg === "menu_digital") {
    const items = db.categories
      .find(c => c.name === "Digital Press")
      ?.items || [];

    const buttons = items.slice(0, 10).map(i => ({
      label: `📄 ${i.item} ${i.gsm || ""}`,
      value: `item_${i.id}`
    }));

    await send(userId, "📁 Digital Press", buildKeyboard(buttons));
    return res.sendStatus(200);
  }

  // =======================
  // ITEM SELECT
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
      await send(userId, "❌ Not found");
      return res.sendStatus(200);
    }

    await send(
      userId,
`📄 ${found.item}

💰 1 side: ${found.s1}
💰 2 side: ${found.s2}

👉 Send: size qty (eg: 3x6 2)`
    );

    return res.sendStatus(200);
  }

  // =======================
  // CALC (SIMPLE V10)
  // =======================
  const sizeMatch = msg.match(/(\d+)\s*[x*]\s*(\d+)/);
  const qtyMatch = msg.match(/(\d+)$/);

  if (sizeMatch) {
    const qty = qtyMatch ? Number(qtyMatch[1]) : 1;
    const area = Number(sizeMatch[1]) * Number(sizeMatch[2]);

    await send(
      userId,
`🧾 RESULT

📏 Size: ${sizeMatch[1]}x${sizeMatch[2]}
📦 Qty: ${qty}

🧮 Area: ${area}

💰 (Auto pricing engine ready)`
    );

    return res.sendStatus(200);
  }

  // =======================
  // DEFAULT MENU
  // =======================
  await send(
    userId,
    "📌 Select menu or type 'hi'",
    buildKeyboard(MENU.start)
  );

  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 V10 BUTTON MENU RUNNING");
});