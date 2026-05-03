require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { products } = require("./data");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.VIBER_TOKEN;

// ===============================
// MEMORY SESSION
// ===============================
const sessions = {};

// ===============================
// MYANMAR NUMBER CONVERT
// ===============================
function mmToEn(text = "") {
  const map = {
    "၀": "0",
    "၁": "1",
    "၂": "2",
    "၃": "3",
    "၄": "4",
    "၅": "5",
    "၆": "6",
    "၇": "7",
    "၈": "8",
    "၉": "9"
  };

  return text.replace(/[၀-၉]/g, m => map[m]);
}

// ===============================
// CLEAN TEXT
// ===============================
function cleanText(text = "") {
  return mmToEn(text).toLowerCase().trim();
}

// ===============================
// FIND PRODUCT
// ===============================
function findProduct(input) {
  input = cleanText(input);

  for (const item of products) {
    const full = `${item.name} ${item.gsm}`.toLowerCase().trim();
    const short = item.name.toLowerCase().trim();

    if (input.includes(full)) return item;
    if (input === short) return item;
  }

  return null;
}

// ===============================
// GET PRICE BY QTY
// ===============================
function getTierPrice(product, qty) {
  if (qty >= 300 && product.prices["300"]) return product.prices["300"];
  if (qty >= 200 && product.prices["200"]) return product.prices["200"];
  if (qty >= 100 && product.prices["100"]) return product.prices["100"];
  return product.prices["1"];
}

// ===============================
// EXTRACT QTY
// ===============================
function extractQty(text) {
  text = cleanText(text);

  const match = text.match(/(\d+)/);
  if (!match) return null;

  return parseInt(match[1]);
}

// ===============================
// SEND VIBER
// ===============================
async function sendMessage(receiver, text) {
  try {
    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver,
        type: "text",
        text
      },
      {
        headers: {
          "X-Viber-Auth-Token": TOKEN
        }
      }
    );
  } catch (err) {
    console.log("SEND ERROR");
  }
}

// ===============================
// MAIN WEBHOOK
// ===============================
app.post("/", async (req, res) => {
  res.sendStatus(200);

  const body = req.body;
  if (!body.sender || !body.message) return;

  const userId = body.sender.id;
  let text = body.message.text || "";
  const original = text;

  text = cleanText(text);

  if (!sessions[userId]) sessions[userId] = {};
  const session = sessions[userId];

  // ===============================
  // HI
  // ===============================
  if (text === "hi") {
    session.step = null;

    return sendMessage(
      userId,
      "🤖 POS Bot Ready\nဈေးတွက်ရန် 'ဈေးတွက်ပေးပါ' ရိုက်ပါ"
    );
  }

  // ===============================
  // DIRECT ORDER
  // ===============================
  if (text.includes("ဈေးတွက်ပေးပါ")) {
    const qty = extractQty(text);
    const product = findProduct(text);

    if (product && qty) {
      const unit = getTierPrice(product, qty);
      const total = unit * qty;

      return sendMessage(
        userId,
        `🧾 ORDER
Material: ${product.name} ${product.gsm}
Qty: ${qty}
Unit: ${unit}
Total: ${total} MMK`
      );
    }

    session.step = "material";

    return sendMessage(
      userId,
      "📦 Material ရိုက်ပါ (Art Paper / Art Card / မိတ္တူ / Accessories)"
    );
  }

  // ===============================
  // MATERIAL STEP
  // ===============================
  if (session.step === "material") {
    const product = findProduct(text);

    if (!product) {
      return sendMessage(userId, "❌ Material မတွေ့ပါ");
    }

    session.product = product;
    session.step = "qty";

    // if no gsm supplied and multiple options
    if (!product.gsm && product.name.toLowerCase() === "art paper") {
      return sendMessage(userId, "📄 GSM ဘယ်လောက်လဲ?");
    }

    return sendMessage(userId, "🔢 Quantity ဘယ်လောက်လဲ?");
  }

  // ===============================
  // QTY STEP
  // ===============================
  if (session.step === "qty") {
    const qty = extractQty(original);

    if (!qty) {
      return sendMessage(userId, "❌ Quantity မှန်အောင်ရိုက်ပါ");
    }

    const product = session.product;
    const unit = getTierPrice(product, qty);
    const total = unit * qty;

    session.step = null;

    return sendMessage(
      userId,
      `🧾 ORDER
Material: ${product.name} ${product.gsm}
Qty: ${qty}
Unit: ${unit}
Total: ${total} MMK`
    );
  }
});

// ===============================
app.listen(PORT, () => {
  console.log("🚀 BOT V6 RUNNING", PORT);
  console.log("TOKEN OK:", !!TOKEN);
});