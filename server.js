require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { prices } = require("./data");

const app = express();
app.use(express.json());

const TOKEN = process.env.VIBER_TOKEN;

// ===== SESSION MEMORY =====
const sessions = {};

// ===== NORMALIZE =====
function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

// ===== GET PRICE =====
function getPrice(material) {
  return prices[normalize(material)] || null;
}

// ===== SEND MESSAGE =====
async function sendMessage(user_id, text) {
  try {
    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver: user_id,
        type: "text",
        text
      },
      {
        headers: {
          "X-Viber-Auth-Token": TOKEN,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (err) {
    console.log("SEND ERROR:", err.message);
  }
}

// ===== WEBHOOK =====
app.post("/", async (req, res) => {
  const event = req.body;

  if (!event || !event.sender) return res.sendStatus(200);

  const user_id = event.sender.id;
  const text = event.message.text;

  if (!sessions[user_id]) sessions[user_id] = {};

  const session = sessions[user_id];

  // ===== START =====
  if (text === "hi") {
    session.step = "material";
    return sendMessage(user_id, "🤖 POS Bot Ready\n📦 Material ရိုက်ပါ");
  }

  // ===== STEP 1 MATERIAL =====
  if (session.step === "material") {
    session.material = text;

    const price = getPrice(text);
    if (!price) {
      return sendMessage(user_id, "❌ Material မတွေ့ပါ");
    }

    session.price = price;
    session.step = "qty";

    return sendMessage(user_id, "🔢 Quantity?");
  }

  // ===== STEP 2 QTY =====
  if (session.step === "qty") {
    const qty = parseInt(text);

    if (isNaN(qty)) {
      return sendMessage(user_id, "❌ Quantity မှန်အောင်ထည့်ပါ");
    }

    session.qty = qty;
    session.total = qty * session.price;

    session.step = null;

    return sendMessage(
      user_id,
      `🧾 ORDER\nMaterial: ${session.material}\nQty: ${qty}\nUnit: ${session.price}\nTotal: ${session.total} MMK`
    );
  }

  res.sendStatus(200);
});

// ===== START =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 BOT V5 RUNNING", PORT);
  console.log("TOKEN OK:", !!TOKEN);
});