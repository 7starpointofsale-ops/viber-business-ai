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
const userState = {};

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
// SAFE INPUT CHECK
const ignoreMsgs = [".", "home", "back", "menu", "start"];

function isNumber(msg) {
  return /^\d+$/.test(msg);
}

// =======================
function findItemSmart(db, msg) {
  let best = null;
  let score = 0;

  const tokens = msg.split(/\s+/);

  db.categories.forEach(c => {
    c.items.forEach(i => {

      let s = 0;

      const name = (i.item || "").toLowerCase();
      const size = (i.size || "").toLowerCase();
      const gsm = String(i.gsm || "");

      tokens.forEach(t => {
        if (name.includes(t)) s += 2;
        if (size === t) s += 5;
        if (gsm === t) s += 4;
      });

      if (s > score) {
        score = s;
        best = i;
      }
    });
  });

  return best;
}

// =======================
app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.event !== "message") return res.sendStatus(200);

  const userId = body.sender.id;
  const rawMsg = body.message.text || "";
  const msg = clean(rawMsg);

  const db = loadDB();

  const state = userState[userId];

  // =======================
  // GLOBAL RESET COMMAND
  if (ignoreMsgs.includes(msg)) {
    delete userState[userId];
    await send(userId, "📦 7Star System\nSelect Service:", kb(SERVICE_MENU));
    return res.sendStatus(200);
  }

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

    if (state?.mode === "calc") {
      userState[userId] = {
        mode: "calc_qty",
        item
      };

      await send(userId,
`📄 ${item.item}
📏 ${item.size}
📦 ${item.gsm}

👉 Qty ဘယ်လောက်?`);

      return res.sendStatus(200);
    }

    await send(userId,
`📄 ${item.item}

📏 Size: ${item.size}
📦 GSM: ${item.gsm}

💰 1 side: ${item.s1}
💰 2 side: ${item.s2}`);

    return res.sendStatus(200);
  }

  // =======================
  // QTY STEP
  if (state?.mode === "calc_qty") {

    if (!isNumber(msg)) {
      await send(userId, "❌ Number only (eg: 100)");
      return res.sendStatus(200);
    }

    userState[userId] = {
      mode: "calc_side",
      item: state.item,
      qty: Number(msg)
    };

    await send(userId,
`🧾 Select Side

📦 Qty: ${msg}`,
kb([
      { label: "1️⃣ 1 Side", value: "side_1" },
      { label: "2️⃣ 2 Side", value: "side_2" }
    ]));

    return res.sendStatus(200);
  }

  // =======================
  // SIDE STEP
  if (msg === "side_1" || msg === "side_2") {

    if (!state || state.mode !== "calc_side") return res.sendStatus(200);

    const item = state.item;
    const qty = state.qty;

    const side = msg === "side_2" ? 2 : 1;
    const price = side === 2 ? item.s2 : item.s1;

    const total = price * qty;

    await send(userId,
`🧾 RESULT

📄 ${item.item}
📏 ${item.size}
📦 ${item.gsm}
🧾 ${side} Side
📦 Qty: ${qty}

💰 Total: ${total} Ks`);

    delete userState[userId];
    return res.sendStatus(200);
  }

  // =======================
  // AI ONLY WHEN NO STATE
  if (!state) {
    const item = findItemSmart(db, msg);

    if (item) {
      await send(userId,
`📄 ${item.item}

📏 ${item.size}
📦 ${item.gsm}

👉 Qty + Side လိုပါတယ်`);

      return res.sendStatus(200);
    }
  }

  // =======================
  await send(userId, "📦 Select Service", kb(SERVICE_MENU));
  res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 STABLE STATE MACHINE VERSION RUNNING");
});