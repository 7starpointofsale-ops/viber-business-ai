const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =======================
function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

// =======================
function clean(msg) {
  return (msg || "")
    .replace(/[📁📄💰🧮📦]/g, "")
    .toLowerCase()
    .trim();
}

// =======================
const userState = {}; // 🔥 MEMORY

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
// GRID UI
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
// AI FIND
function findItemSmart(db, msg) {
  let best = null;
  let score = 0;

  db.categories.forEach(c => {
    c.items.forEach(i => {
      let s = 0;

      if (msg.includes(i.item.toLowerCase())) s += 3;
      if (msg.includes((i.size || "").toLowerCase())) s += 2;
      if (msg.includes(String(i.gsm))) s += 2;

      if (s > score) {
        score = s;
        best = i;
      }
    });
  });

  return best;
}

// =======================
// PARSE
function parseInput(msg) {
  const qtyMatch = msg.match(/(\d+)/);
  const side = msg.includes("2") && msg.includes("side") ? 2 : 1;

  return {
    qty: qtyMatch ? Number(qtyMatch[1]) : 1,
    side
  };
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
  // START
  if (["hi", "hello", "start", "menu", "မင်္ဂလာပါ"].includes(msg)) {
    await send(userId, "📦 7Star System\nSelect Service:", kb(SERVICE_MENU));
    return res.sendStatus(200);
  }

  // =======================
  // 💰 PRICE FLOW
  if (msg === "service_price") {
    const cats = db.categories.map((c, i) => ({
      label: `📁 ${c.name}`,
      value: `cat_${i}`
    }));
    await send(userId, "📁 Select Category", kb(cats));
    return res.sendStatus(200);
  }

  // =======================
  // 🧮 CALC FLOW START
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
  // CATEGORY
  if (msg.startsWith("cat_")) {
    const index = Number(msg.replace("cat_", ""));
    const category = db.categories[index];

    const items = category.items.map((i, idx) => ({
      label: `📄 ${i.item} ${i.size} ${i.gsm}`,
      value: `item_${index}_${idx}`
    }));

    await send(userId, `📁 ${category.name}`, kb(items));
    return res.sendStatus(200);
  }

  // =======================
  // ITEM CLICK
  if (msg.startsWith("item_")) {
    const parts = msg.split("_");
    const item = db.categories[parts[1]]?.items[parts[2]];

    const state = userState[userId];

    // 🔥 CALC MODE
    if (state && state.mode === "calc") {

      userState[userId] = {
        mode: "calc_qty",
        item
      };

      await send(
        userId,
`📄 ${item.item}
📏 ${item.size}
📦 ${item.gsm}

👉 Qty ဘယ်လောက်?`
      );

      return res.sendStatus(200);
    }

    // NORMAL
    await send(
      userId,
`📄 ${item.item}

📏 Size: ${item.size}
📦 GSM: ${item.gsm}

💰 1 side: ${item.s1}
💰 2 side: ${item.s2}`
    );

    return res.sendStatus(200);
  }

  // =======================
  // 🔥 QTY INPUT
  const state = userState[userId];

  if (state && state.mode === "calc_qty") {

    const qty = Number(msg);

    if (!qty) {
      await send(userId, "❌ Qty number only (eg: 100)");
      return res.sendStatus(200);
    }

    const item = state.item;

    const total1 = item.s1 * qty;
    const total2 = item.s2 * qty;

    await send(
      userId,
`🧾 RESULT

📄 ${item.item}
📏 ${item.size}
📦 ${item.gsm}
📦 Qty: ${qty}

💰 1 side = ${total1} Ks
💰 2 side = ${total2} Ks`
    );

    delete userState[userId];
    return res.sendStatus(200);
  }

  // =======================
  // 🤖 AI CHAT (DIRECT)
  const item = findItemSmart(db, msg);

  if (item) {
    const parsed = parseInput(msg);

    const price = parsed.side === 2 ? item.s2 : item.s1;
    const total = price * parsed.qty;

    if (
      msg.includes(item.item.toLowerCase()) &&
      msg.includes(item.size.toLowerCase()) &&
      msg.includes(String(item.gsm))
    ) {
      await send(
        userId,
`🧾 RESULT

📄 ${item.item}
📏 ${item.size}
📦 ${item.gsm}
🧾 ${parsed.side} side
📦 Qty: ${parsed.qty}

💰 Total: ${total} Ks`
      );

      return res.sendStatus(200);
    }

    await send(
      userId,
`📄 ${item.item}

📏 Size?
📦 GSM?
🧾 1 side / 2 side?`
    );

    return res.sendStatus(200);
  }

  // =======================
  await send(userId, "📦 Select Service", kb(SERVICE_MENU));
  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 V16 FINAL PERFECT FLOW");
});