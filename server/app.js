const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const multer = require("multer");

const upload = multer({ dest: "uploads/" });
const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ===================== PATH =====================
const DB_PATH = path.join(__dirname, "../database/price.db.json");

function ensure(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }
}

ensure(DB_PATH, { categories: [] });

// ===================== LOAD DB =====================
function loadDB() {
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    if (!db.categories) db.categories = [];
    return db;
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
async function send(userId, text, keyboard = null) {
  try {
    const body = {
      receiver: userId,
      type: "text",
      text,
      min_api_version: 7
    };

    if (keyboard) {
      body.keyboard = keyboard;
    }

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
    DefaultHeight: false,
    Buttons: items.map(i => ({
      Columns: 3,
      Rows: 1,
      BgColor: "#2d3748",
      ActionType: "reply",
      ActionBody: i.value,
      Text: `<font color="#ffffff">${i.label}</font>`
    }))
  };
}

// ===================== REMOVE BG =====================
async function removeBG(filePath) {
  const form = new FormData();

  form.append(
    "image_file",
    fs.createReadStream(filePath)
  );

  const response = await axios.post(
    "https://api.remove.bg/v1.0/removebg",
    form,
    {
      responseType: "arraybuffer",
      headers: {
        ...form.getHeaders(),
        "X-Api-Key": process.env.REMOVE_BG_KEY
      },
      timeout: 30000
    }
  );

  return response.data;
}

// ===================== IMAGE HANDLER =====================
async function handleImage(body, userId) {
  try {
    const imageUrl = body.message?.media;

    console.log("TYPE:", body.message?.type);
    console.log("MEDIA:", imageUrl);

    if (!imageUrl) {
      return send(userId, "❌ Image not found");
    }

    // download image
    const image = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 20000
    });

    // save temp
    const tempPath = path.join(
      __dirname,
      "../uploads/temp.jpg"
    );

    fs.writeFileSync(tempPath, image.data);

    // remove bg
    const result = await removeBG(tempPath);

    // delete temp
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    // reset state
    delete userState[userId];

    // send result
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
          "X-Viber-Auth-Token":
            process.env.VIBER_TOKEN
        }
      }
    );

  } catch (e) {
    console.log("BG ERROR:", e.message);

    await send(
      userId,
      "❌ BG remove failed"
    );
  }
}

// ===================== WEBHOOK =====================
app.post("/webhook", async (req, res) => {

  res.sendStatus(200);

  try {

    const body = req.body;

    if (!body.event) return;

    const userId = body.sender.id;

    // anti duplicate
    const token =
      userId +
      "_" +
      (body.message?.token || "");

    if (msgCache[token]) return;

    msgCache[token] = true;

    setTimeout(() => {
      delete msgCache[token];
    }, 30000);

    // ===================== MESSAGE =====================
    let msg =
      (body.message?.text || "")
        .toLowerCase()
        .trim();

    // FIX VIBER BUTTON TEXT
    if (msg.includes("bg")) {
      msg = "bg";
    }

    if (msg.includes("price")) {
      msg = "price";
    }

    if (msg.includes("calc")) {
      msg = "calc";
    }

    if (msg.includes("home")) {
      msg = "home";
    }

    if (msg.includes("hi")) {
      msg = "hi";
    }

    // ===================== IMAGE DETECT =====================
    const isImage =
      body.message?.type === "picture" ||
      body.message?.type === "file" ||
      body.message?.media;

    if (
      isImage &&
      userState[userId]?.mode === "bg"
    ) {
      return handleImage(body, userId);
    }

    // ===================== HOME =====================
    if (
      ["hi", "hello", "home", "menu"]
        .includes(msg)
    ) {
      return send(
        userId,
        "📦 7Star System",
        kb(MENU)
      );
    }

    // ===================== BG =====================
    if (msg === "bg") {

      userState[userId] = {
        mode: "bg"
      };

      return send(
        userId,
`🖼 BG Mode ON

👉 photo ပို့ပါ
👉 auto remove လုပ်မယ်`
      );
    }

    // ===================== PRICE =====================
    if (msg === "price") {

      const db = loadDB();

      const cats = db.categories.map(
        (c, i) => ({
          label: `📁 ${c.name}`,
          value: `cat_${i}`
        })
      );

      return send(
        userId,
        "📁 Category",
        kb(cats)
      );
    }

    // ===================== CALC =====================
    if (msg === "calc") {

      return send(
        userId,
        "🧮 Calc mode..."
      );
    }

    // ===================== CATEGORY =====================
    if (msg.startsWith("cat_")) {

      const db = loadDB();

      const index = Number(
        msg.replace("cat_", "")
      );

      const cat = db.categories[index];

      if (!cat) return;

      const items = (cat.items || []).map(
        (item, i) => ({
          label: `📄 ${item.item}`,
          value: `item_${index}_${i}`
        })
      );

      return send(
        userId,
        `📁 ${cat.name}`,
        kb(items)
      );
    }

    // ===================== ITEM =====================
    if (msg.startsWith("item_")) {

      const db = loadDB();

      const parts = msg.split("_");

      const catIndex = parts[1];
      const itemIndex = parts[2];

      const item =
        db.categories?.[catIndex]
          ?.items?.[itemIndex];

      if (!item) return;

      return send(
        userId,
`📄 ${item.item}

📏 ${item.size || "-"}

📦 ${item.gsm || "-"}

💰 1 Side:
${item.s1 || 0}

💰 2 Side:
${item.s2 || 0}`
      );
    }

    // ===================== DEFAULT =====================
    return send(
      userId,
      "📦 Menu",
      kb(MENU)
    );

  } catch (e) {

    console.log(
      "WEBHOOK ERROR:",
      e.message
    );
  }
});

// ===================== START =====================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 RUNNING ON", PORT);
});