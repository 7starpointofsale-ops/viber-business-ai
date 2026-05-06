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
// 🔥 PREMIUM CAROUSEL SEND
// =======================
async function sendCarousel(userId, items) {
  await axios.post(
    "https://chatapi.viber.com/pa/send_message",
    {
      receiver: userId,
      type: "rich_media",
      rich_media: {
        Type: "rich_media",
        ButtonsGroupColumns: 6,
        ButtonsGroupRows: 7,
        BgColor: "#1E1E2F",
        Buttons: items.map(i => ({
          Columns: 6,
          Rows: 2,
          ActionType: "reply",
          ActionBody: i.value,
          Text: `<font color="#FFFFFF"><b>${i.label}</b></font>`,
          TextSize: "medium",
          BgColor: "#2A2A40"
        }))
      }
    },
    {
      headers: {
        "X-Viber-Auth-Token": process.env.VIBER_TOKEN
      }
    }
  );
}

// =======================
async function send(userId, text) {
  await axios.post(
    "https://chatapi.viber.com/pa/send_message",
    {
      receiver: userId,
      type: "text",
      text
    },
    {
      headers: {
        "X-Viber-Auth-Token": process.env.VIBER_TOKEN
      }
    }
  );
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
  const msg = clean(body.message.text || "");
  const db = loadDB();

  // =======================
  // START
  if (["hi", "hello", "start", "menu", "မင်္ဂလာပါ"].includes(msg)) {
    await sendCarousel(userId, SERVICE_MENU);
    return res.sendStatus(200);
  }

  // =======================
  // CATEGORY
  if (msg === "service_price") {

    const cats = db.categories.map((c, i) => ({
      label: c.name,
      value: "cat_" + i
    }));

    await sendCarousel(userId, cats);
    return res.sendStatus(200);
  }

  // =======================
  // CATEGORY CLICK
  if (msg.startsWith("cat_")) {

    const index = Number(msg.replace("cat_", ""));
    const category = db.categories[index];

    if (!category) {
      await send(userId, "❌ Category error");
      return res.sendStatus(200);
    }

    const items = category.items.map((i, idx) => ({
      label: `${i.item} ${i.size} ${i.gsm}`,
      value: `item_${index}_${idx}`
    }));

    await sendCarousel(userId, items);
    return res.sendStatus(200);
  }

  // =======================
  // ITEM CLICK
  if (msg.startsWith("item_")) {

    const [_, c, i] = msg.split("_");
    const item = db.categories[c]?.items[i];

    if (!item) {
      await send(userId, "❌ Item error");
      return res.sendStatus(200);
    }

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
  // CALC
  if (/^[0-9+\-*/().\s]+$/.test(msg)) {
    try {
      const r = eval(msg);
      await send(userId, `🧮 ${r}`);
    } catch {}
    return res.sendStatus(200);
  }

  // =======================
  await sendCarousel(userId, SERVICE_MENU);
  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 V13 PREMIUM UI RUNNING");
});