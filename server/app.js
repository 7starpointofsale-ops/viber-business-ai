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
      Columns: 6,
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
  // SERVICE → CATEGORY
  if (msg === "service_price") {

    const cats = db.categories.map((c, i) => ({
      label: `📁 ${c.name}`,
      value: "cat_" + i   // 🔥 ID BASED
    }));

    await send(userId, "📁 Select Category", kb(cats));
    return res.sendStatus(200);
  }

  // =======================
  // CATEGORY CLICK (FIXED 100%)
  if (msg.startsWith("cat_")) {

    const index = Number(msg.replace("cat_", ""));
    const category = db.categories[index];

    if (!category) {
      await send(userId, "❌ Category error");
      return res.sendStatus(200);
    }

    const items = category.items.map((i, idx) => ({
      label: `📄 ${i.item} ${i.size || ""} ${i.gsm || ""}`,
      value: `item_${index}_${idx}`   // 🔥 ID BASED
    }));

    await send(userId, `📁 ${category.name}`, kb(items));
    return res.sendStatus(200);
  }

  // =======================
  // ITEM CLICK (FIXED 100%)
  if (msg.startsWith("item_")) {

    const parts = msg.split("_");
    const catIndex = Number(parts[1]);
    const itemIndex = Number(parts[2]);

    const category = db.categories[catIndex];
    const item = category?.items[itemIndex];

    if (!item) {
      await send(userId, "❌ Item error");
      return res.sendStatus(200);
    }

    await send(
      userId,
`📄 ${item.item}

📏 Size: ${item.size || "-"}
📦 GSM: ${item.gsm || "-"}

💰 1 side: ${item.s1}
💰 2 side: ${item.s2}`
    );

    return res.sendStatus(200);
  }

  // =======================
  // CALCULATOR
  if (/^[0-9+\-*/().\s]+$/.test(msg)) {
    try {
      const r = eval(msg);
      await send(userId, `🧮 ${r}`);
    } catch {}
    return res.sendStatus(200);
  }

  // =======================
  await send(userId, "📦 Select Service", kb(SERVICE_MENU));
  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 V12 FINAL STABLE RUNNING");
});