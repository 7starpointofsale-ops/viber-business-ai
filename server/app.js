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
function ensure(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }
}

ensure(DB_PATH, { categories: [] });

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
// NORMALIZE
// =======================================
function clean(t = "") {
  return t.replace(/\u200B/g, "").trim().toLowerCase();
}

// =======================================
// SEND VIBER
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
      Text: `<font color="#ffffff">${i.label}</font>`
    }))
  };
}

// =======================================
// REMOVE BG CORE
// =======================================
async function removeBG(file) {
  const form = new FormData();
  form.append("image_file", fs.createReadStream(file));

  const res = await axios.post(
    "https://api.remove.bg/v1.0/removebg",
    form,
    {
      responseType: "arraybuffer",
      headers: {
        ...form.getHeaders(),
        "X-Api-Key": process.env.REMOVE_BG_KEY
      },
      timeout: 20000
    }
  );

  return res.data;
}

// =======================================
// IMAGE HANDLER
// =======================================
async function handleImage(body, id) {
  try {
    const url = body.message.media;

    const img = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 20000
    });

    const file = path.join(__dirname, "../uploads/tmp.jpg");
    fs.writeFileSync(file, img.data);

    const result = await removeBG(file);

    fs.unlinkSync(file);

    delete userState[id];

    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver: id,
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
    await send(id, "❌ BG remove failed");
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
    // IMAGE AUTO DETECT
    // ===================================
    if (
      body.message &&
      body.message.type === "picture" &&
      body.message.media &&
      userState[id]?.mode === "bg"
    ) {
      return handleImage(body, id);
    }

    // ===================================
    // HOME
    // ===================================
    if (["hi", "hello", "home", "menu"].includes(msg)) {
      delete userState[id];
      return send(id, "📦 7Star System", kb(MENU));
    }

    // ===================================
    // BG MODE FIX
    // ===================================
    const bgTriggers = new Set([
      "bg",
      "🖼 bg remove",
      "🖼 bg",
      "remove bg"
    ]);

    if (bgTriggers.has(msg)) {
      userState[id] = { mode: "bg" };

      return send(id,
`🖼 BG Remove Mode

👉 photo တစ်ပုံပို့ပါ
👉 auto background ဖျက်မယ်`
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

    return send(id, "📦 Menu", kb(MENU));

  } catch (e) {
    console.log("WEBHOOK ERROR:", e.message);
  }
});

// =======================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 RUNNING ON", PORT));