const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// =======================================
// PATH
// =======================================
const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================================
// INIT DB
// =======================================
function ensureFile(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }
}

ensureFile(DB_PATH, { categories: [] });

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
  { label: "💰 Price", value: "price" },
  { label: "🧮 Calc", value: "calc" },
  { label: "🖼 BG Remove", value: "bg" }
];

// =======================================
// CLEAN
// =======================================
function clean(t = "") {
  return t.replace(/\u200B/g, "").trim().toLowerCase();
}

// =======================================
// SEND MESSAGE
// =======================================
async function send(id, text, kb = null) {
  try {
    const body = {
      receiver: id,
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
      BgColor: "#2d3748",
      Text: `<font color="#fff">${i.label}</font>`
    }))
  };
}

// =======================================
// REMOVE BG
// =======================================
async function removeBG(buffer) {
  const form = new FormData();
  form.append("image_file", buffer, "image.jpg");

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
// IMAGE HANDLER (IMPORTANT)
// =======================================
async function handleImage(body, userId) {
  try {
    const imgUrl = body.message.media;

    const img = await axios.get(imgUrl, {
      responseType: "arraybuffer"
    });

    const result = await removeBG(img.data);

    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver: userId,
        type: "picture",
        media:
          "data:image/png;base64," +
          Buffer.from(result).toString("base64")
      },
      {
        headers: {
          "X-Viber-Auth-Token": process.env.VIBER_TOKEN
        }
      }
    );

  } catch (e) {
    console.log("BG ERROR:", e.message);
    await send(userId, "❌ BG remove failed");
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

    const id = body.sender.id;

    const token = id + "_" + (body.message?.token || "");
    if (msgCache[token]) return;
    msgCache[token] = true;
    setTimeout(() => delete msgCache[token], 30000);

    const msg = clean(body.message?.text || "");
    const db = loadDB();

    // ===================================
    // IMAGE AUTO BG REMOVE
    // ===================================
    if (body.message?.type === "picture") {
      await handleImage(body, id);
      return;
    }

    // ===================================
    // HOME
    // ===================================
    if (["hi", "hello", "home", "menu"].includes(msg)) {
      return send(id, "📦 7Star System", kb(MENU));
    }

    // ===================================
    // BG MODE (IMPORTANT UX FIX)
    // ===================================
    if (msg === "bg") {
      userState[id] = { mode: "bg" };

      return send(
        id,
`🖼 BG Remove Mode

👉 Photo ပို့လိုက်ပါ
👉 Auto background remove လုပ်မယ်

⚠️ Upload button မလိုပါ (Viber limitation)`
      );
    }

    // ===================================
    // PRICE
    // ===================================
    if (msg === "price") {
      const cats = db.categories.map((c, i) => ({
        label: `📁 ${c.name}`,
        value: `cat_${i}`
      }));

      return send(id, "📁 Category", kb(cats));
    }

    // ===================================
    // CALC
    // ===================================
    if (msg === "calc") {
      userState[id] = { mode: "calc" };

      const cats = db.categories.map((c, i) => ({
        label: `📁 ${c.name}`,
        value: `cat_${i}`
      }));

      return send(id, "🧮 Category", kb(cats));
    }

    // ===================================
    // CATEGORY
    // ===================================
    if (msg.startsWith("cat_")) {
      const i = Number(msg.split("_")[1]);
      const cat = db.categories[i];
      if (!cat) return;

      const items = cat.items.map((it, x) => ({
        label: `📄 ${it.item}`,
        value: `item_${i}_${x}`
      }));

      return send(id, cat.name, kb(items));
    }

    // ===================================
    // ITEM
    // ===================================
    if (msg.startsWith("item_")) {
      const [, c, i] = msg.split("_");
      const item = db.categories?.[c]?.items?.[i];
      if (!item) return;

      return send(
        id,
`📄 ${item.item}
📏 ${item.size || "-"}
📦 ${item.gsm || "-"}

💰 1 Side: ${item.s1}
💰 2 Side: ${item.s2}`
      );
    }

    return send(id, "📦 Menu", kb(MENU));

  } catch (e) {
    console.log("WEBHOOK ERROR:", e.message);
  }
});

// =======================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 RUNNING ON", PORT));