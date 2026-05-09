const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

const app = express();

app.use(express.json({ limit: "10mb" }));

// =====================================
// CONFIG
// =====================================
const TOKEN = process.env.VIBER_TOKEN;
const REMOVE_BG_KEY = process.env.REMOVE_BG_KEY;

// =====================================
// STATE
// =====================================
const userState = {};
const cache = {};

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
// REMOVE BG
// =====================================
async function removeBG(filePath) {
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
      }
    }
  );

  return res.data;
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
    console.log("BG ERROR:", e.message);
    await send(id, "❌ BG remove failed");
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

  // =================================
  // HOME
  // =================================
  if (msg === "hi" || msg === "home") {
    userState[id] = {};
    return send(id, "📦 7Star BG Bot");
  }

  // =================================
  // BG MODE ENABLE (FIXED)
  // =================================
  if (msg.includes("bg")) {
    userState[id] = { mode: "bg" };

    return send(id,
`🖼 BG Mode ON

👉 photo ပို့ပါ
👉 auto remove လုပ်မယ်`
    );
  }

  // =================================
  // IMAGE CHECK (IMPORTANT FIX)
  // =================================
  if (
    body.message &&
    body.message.type === "picture" &&
    body.message.media &&
    userState[id]?.mode === "bg"
  ) {
    return handleImage(body, id);
  }

  return send(id, "👉 type 'bg' to start");
});

// =====================================
app.listen(10000, () => {
  console.log("🚀 RUNNING ON 10000");
});