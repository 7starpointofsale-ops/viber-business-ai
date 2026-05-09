const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

const app = express();

app.use(express.json({ limit: "10mb" }));

// =====================================
// ENV
// =====================================
const TOKEN = process.env.VIBER_TOKEN;
const REMOVE_BG_KEY = process.env.REMOVE_BG_KEY;

// =====================================
// STATE
// =====================================
const userState = {};
const msgCache = {};

// =====================================
// MENU
// =====================================
const MENU = [
  { label: "🖼 BG Remove", value: "bg" }
];

// =====================================
// SEND
// =====================================
async function send(id, text) {
  try {
    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver: id,
        type: "text",
        text
      },
      {
        headers: { "X-Viber-Auth-Token": TOKEN }
      }
    );
  } catch (e) {
    console.log("SEND ERROR:", e.message);
  }
}

// =====================================
// KEYBOARD
// =====================================
function kb(items) {
  return {
    Type: "keyboard",
    Buttons: items.map(i => ({
      Columns: 6,
      Rows: 1,
      ActionType: "reply",
      ActionBody: i.value,
      Text: i.label
    }))
  };
}

// =====================================
// SAFE REMOVE BG (NO CRASH VERSION)
// =====================================
async function removeBG(filePath) {
  try {
    if (!REMOVE_BG_KEY) {
      throw new Error("REMOVE_BG_KEY missing");
    }

    const form = new FormData();
    form.append("image_file", fs.createReadStream(filePath));

    const res = await axios.post(
      "https://api.remove.bg/v1.0/removebg",
      form,
      {
        responseType: "arraybuffer",
        headers: {
          ...form.getHeaders(),
          "X-Api-Key": REMOVE_BG_KEY
        },
        timeout: 20000
      }
    );

    return res.data;

  } catch (e) {
    console.log("REMOVE BG ERROR:", e.response?.data || e.message);
    return null;
  }
}

// =====================================
// IMAGE HANDLER
// =====================================
async function handleImage(body, id) {
  try {
    const url = body.message.media;

    const img = await axios.get(url, {
      responseType: "arraybuffer"
    });

    const file = path.join(__dirname, "tmp.jpg");
    fs.writeFileSync(file, img.data);

    const result = await removeBG(file);

    fs.unlinkSync(file);

    delete userState[id];

    // ❌ FAIL SAFE
    if (!result) {
      return send(id,
        "❌ BG remove failed\n👉 API key သို့မဟုတ် limit ပြဿနာရှိနိုင်ပါတယ်"
      );
    }

    // SUCCESS
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
        headers: { "X-Viber-Auth-Token": TOKEN }
      }
    );

  } catch (e) {
    console.log("IMAGE ERROR:", e.message);
    await send(id, "❌ Image processing failed");
  }
}

// =====================================
// WEBHOOK
// =====================================
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  const body = req.body;
  if (!body.event) return;

  const id = body.sender.id;
  const msg = (body.message?.text || "").toLowerCase().trim();

  // cache
  const token = id + "_" + (body.message?.token || "");
  if (msgCache[token]) return;
  msgCache[token] = true;
  setTimeout(() => delete msgCache[token], 30000);

  // =====================================
  // HOME
  // =====================================
  if (["hi", "home", "menu"].includes(msg)) {
    userState[id] = {};
    return send(id, "📦 7Star BG Bot");
  }

  // =====================================
  // BG MODE ON
  // =====================================
  if (msg.includes("bg")) {
    userState[id] = { mode: "bg" };

    return send(id,
`🖼 BG Mode ON

👉 photo ပို့ပါ
👉 auto remove လုပ်မယ်`
    );
  }

  // =====================================
  // IMAGE DETECT
  // =====================================
  if (
    body.message &&
    body.message.type === "picture" &&
    body.message.media &&
    userState[id]?.mode === "bg"
  ) {
    return handleImage(body, id);
  }

  return send(id, "👉 type 'bg'");
});

// =====================================
app.listen(10000, () => {
  console.log("🚀 RUNNING ON 10000");
});