const express = require("express");
const axios = require("axios");
const { priceTable } = require("./data");

const app = express();
app.use(express.json());

const TOKEN = process.env.VIBER_TOKEN;

// STATE
const userState = {};

// NORMALIZE FUNCTION (IMPORTANT FIX)
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace("128 g", "128g")
    .trim();
}

// SEND MESSAGE
function sendMessage(receiver, text) {
  return axios.post(
    "https://chatapi.viber.com/pa/send_message",
    {
      receiver,
      type: "text",
      text,
    },
    {
      headers: {
        "X-Viber-Auth-Token": TOKEN,
      },
    }
  );
}

// WEBHOOK
app.post("/webhook", async (req, res) => {
  const event = req.body;

  if (!event?.sender) return res.sendStatus(200);

  const userId = event.sender.id;
  const text = normalize(event.message?.text || "");

  if (!userState[userId]) {
    userState[userId] = { step: 0 };
  }

  // START
  if (text === "hi") {
    userState[userId] = { step: 1 };
    await sendMessage(
      userId,
      "🤖 POS Bot Ready\nဈေးတွက်ရန် 'ဈေးတွက်ပေးပါ' ရိုက်ပါ"
    );
    return res.sendStatus(200);
  }

  // STEP 1
  if (text.includes("ဈေး")) {
    userState[userId].step = 2;
    await sendMessage(userId, "📦 Material ရိုက်ပါ (Art Paper / Art Card)");
    return res.sendStatus(200);
  }

  // STEP 2
  if (userState[userId].step === 2) {
    userState[userId].material = text;
    userState[userId].step = 3;

    await sendMessage(userId, "🔢 Quantity ဘယ်လောက်လဲ?");
    return res.sendStatus(200);
  }

  // STEP 3 (CALC)
  if (userState[userId].step === 3) {
    const qty = parseInt(text);

    const material = userState[userId].material;

    const priceData = priceTable[material];

    if (!priceData) {
      await sendMessage(userId, "❌ Material မတွေ့ပါ");
      return res.sendStatus(200);
    }

    const unit = priceData["1"];
    const total = unit * qty;

    await sendMessage(
      userId,
      `🧾 ORDER\nMaterial: ${material}\nQty: ${qty}\nUnit: ${unit}\nTotal: ${total} MMK`
    );

    userState[userId] = { step: 0 };
    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// ROOT
app.get("/", (req, res) => {
  res.send("V4 POS BOT RUNNING");
});

// START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("BOT V4 RUNNING", PORT);
});