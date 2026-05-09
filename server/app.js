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

// ===================== DB =====================
const DB_PATH = path.join(__dirname, "../database/price.db.json");

function ensure(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }
}
ensure(DB_PATH, { categories: [] });

let cache = null;

function loadDB() {
  try {
    cache = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    return cache;
  } catch {
    return { categories: [] };
  }
}

// ===================== STATE =====================
const userState = {};
const msgCache = {};

// ===================== MENU =====================
const MENU = [
  { label: "💰 Price", value: "price" },
  { label: "🧮 Calc", value: "calc" },
  { label: "🖼 BG Remove", value: "bg" }
];

// ===================== SEND =====================
async function send(id, text, kb = null) {
  try {
    const body = {
      receiver: id,
      type: "text",
      text
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

// ===================== KEYBOARD =====================
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

// ===================== REMOVE BG =====================
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
      }
    }
  );

  return res.data;
}

// ===================== IMAGE HANDLER =====================
async function handleImage(body, userId) {
  try {
    const url = body.message.media;

    if (!url) return send(userId, "❌ No image received");

    const img = await axios.get(url, {
      responseType: "arraybuffer"
    });

    const file = path.join(__dirname, "../uploads/tmp.jpg");
    fs.writeFileSync(file, img.data);

    const result = await removeBG(file);

    fs.unlinkSync(file);

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

// ===================== WEBHOOK =====================
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  const body = req.body;
  if (!body.event) return;

  const userId = body.sender.id;

  // anti spam
  const key = userId + "_" + (body.message?.token || "");
  if (msgCache[key]) return;
  msgCache[key] = true;

  setTimeout(() => delete msgCache[key], 30000);

  const msg = (body.message?.text || "").toLowerCase().trim();
  const db = loadDB();

  // ================= BG MODE =================
  if (msg === "bg") {
    userState[userId] = { mode: "bg" };

    return send(
      userId,
`🖼 BG Mode ON

👉 photo ပို့ပါ
👉 auto remove လုပ်မယ်`
    );
  }

  // ================= MENU =================
  if (["hi", "hello", "home", "menu"].includes(msg)) {
    return send(userId, "📦 7Star BG Bot", kb(MENU));
  }

  // ================= PHOTO =================
  if (body.message?.type === "picture") {
    if (userState[userId]?.mode === "bg") {
      return handleImage(body, userId);
    }
  }

  // ================= BUTTON =================
  if (msg === "price") return send(userId, "Price list coming...");
  if (msg === "calc") return send(userId, "Calc mode...");

  return send(userId, "📦 Menu", kb(MENU));
});

// ===================== START =====================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 RUNNING ON", PORT));