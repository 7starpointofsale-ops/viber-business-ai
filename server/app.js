const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");

const upload = multer({ dest: "uploads/" });
const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// =======================================
// PATH
// =======================================
const DB_PATH = path.join(__dirname, "../database/price.db.json");
const ORDER_PATH = path.join(__dirname, "../database/orders.db.json");
const TEMP_IMG = path.join(__dirname, "../uploads/temp.jpg");

// =======================================
// INIT FILES
// =======================================
function ensure(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }
}

ensure(DB_PATH, { categories: [] });
ensure(ORDER_PATH, { orders: [] });

// =======================================
// CACHE
// =======================================
let cache = null;
let last = 0;

function loadDB() {
  const now = Date.now();
  if (cache && now - last < 3000) return cache;

  try {
    cache = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    if (!cache.categories) cache.categories = [];
    last = now;
    return cache;
  } catch {
    return { categories: [] };
  }
}

// =======================================
// STATE
// =======================================
const userState = {};
const msgCache = {};

// =======================================
// MENU
// =======================================
const MENU = [
  { label: "💰 ဈေးမေးမယ်", value: "price" },
  { label: "🧮 ဈေးတွက်မယ်", value: "calc" },
  { label: "🖼 BG ဖျက်မယ်", value: "removebg" }
];

// =======================================
// CLEAN
// =======================================
function clean(t = "") {
  return t.replace(/\u200B/g, "").trim().toLowerCase();
}

// =======================================
// SEND VIBER
// =======================================
async function send(userId, text, kb = null) {
  try {
    const body = {
      receiver: userId,
      type: "text",
      text,
      min_api_version: 7
    };

    if (kb) body.keyboard = kb;

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
    console.log("SEND ERROR:", e.message);
  }
}

// =======================================
// KEYBOARD
// =======================================
function kb(items) {
  return {
    Type: "keyboard",
    Buttons: items.map(i => ({
      Columns: 3,
      Rows: 1,
      ActionType: "reply",
      ActionBody: i.value,
      Text: `<font color="#ffffff">${i.label}</font>`,
      BgColor: "#2d3748"
    }))
  };
}

// =======================================
// REMOVE BG CORE
// =======================================
async function removeBG(imagePath) {
  const form = new FormData();
  form.append("image_file", fs.createReadStream(imagePath));

  const res = await axios.post(
    "https://api.remove.bg/v1.0/removebg",
    form,
    {
      responseType: "arraybuffer",
      headers: {
        ...form.getHeaders(),
        "X-Api-Key": process.env.REMOVE_BG_KEY
      }
    }
  );

  return res.data;
}

// =======================================
// IMAGE HANDLER (AUTO BG REMOVE)
// =======================================
async function handleImage(body) {
  try {
    const userId = body.sender.id;
    const url = body.message.media;

    const img = await axios.get(url, { responseType: "arraybuffer" });
    fs.writeFileSync(TEMP_IMG, img.data);

    const result = await removeBG(TEMP_IMG);

    fs.unlinkSync(TEMP_IMG);

    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver: userId,
        type: "picture",
        media: "data:image/png;base64," + Buffer.from(result).toString("base64")
      },
      {
        headers: {
          "X-Viber-Auth-Token": process.env.VIBER_TOKEN
        }
      }
    );

  } catch (e) {
    console.log("IMG ERROR:", e.message);
  }
}

// =======================================
// WEBHOOK
// =======================================
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  try {
    const body = req.body;
    if (!body.event) return;

    // IMAGE AUTO
    if (body.message?.type === "picture") {
      return handleImage(body);
    }

    const userId = body.sender.id;

    const token = userId + "_" + body.message.token;
    if (msgCache[token]) return;
    msgCache[token] = true;
    setTimeout(() => delete msgCache[token], 30000);

    let msg = clean(body.message.text || "");

    const db = loadDB();

    // HOME
    if (["hi", "hello", "start", "menu", "home"].includes(msg)) {
      userState[userId] = {};
      return send(userId, "📦 7Star System", kb(MENU));
    }

    // MENU ACTIONS
    if (msg === "price") {
      const cats = db.categories.map((c, i) => ({
        label: `📁 ${c.name}`,
        value: `cat_${i}`
      }));
      return send(userId, "📁 Category", kb(cats));
    }

    if (msg === "calc") {
      userState[userId] = { mode: "calc" };
      const cats = db.categories.map((c, i) => ({
        label: `📁 ${c.name}`,
        value: `cat_${i}`
      }));
      return send(userId, "🧮 Category", kb(cats));
    }

    if (msg === "removebg") {
      return send(
        userId,
        "🖼 BG Remove\n\n📌 Photo တစ်ပုံပို့ပါ\nအလိုအလျောက် background ဖျက်ပေးမယ်"
      );
    }

    // CATEGORY
    if (msg.startsWith("cat_")) {
      const i = Number(msg.split("_")[1]);
      const cat = db.categories[i];
      if (!cat) return;

      const items = cat.items.map((it, x) => ({
        label: `📄 ${it.item}`,
        value: `item_${i}_${x}`
      }));

      return send(userId, `📁 ${cat.name}`, kb(items));
    }

    // ITEM
    if (msg.startsWith("item_")) {
      const [_, c, i] = msg.split("_");
      const item = db.categories?.[c]?.items?.[i];
      if (!item) return;

      return send(
        userId,
`📄 ${item.item}
📏 ${item.size || "-"}
📦 ${item.gsm || "-"}

💰 1 Side: ${item.s1}
💰 2 Side: ${item.s2}`
      );
    }

    return send(userId, "📦 Menu", kb(MENU));

  } catch (e) {
    console.log("WEBHOOK ERROR:", e.message);
  }
});

// =======================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 RUNNING ON", PORT));