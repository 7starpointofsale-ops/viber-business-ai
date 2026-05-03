require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { products } = require("./data");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.VIBER_TOKEN;

// ===============================
// USER SESSION
// ===============================
const sessions = {};

// ===============================
// MYANMAR NUMBER SUPPORT
// ===============================
function mmToEng(text = "") {
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

  return text.replace(/[၀-၉]/g, s => map[s]);
}

// ===============================
// CLEAN TEXT
// ===============================
function cleanText(text = "") {
  return mmToEng(text).toLowerCase().trim();
}

// ===============================
// SEND MESSAGE
// ===============================
async function sendMessage(userId, text) {
  try {
    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver: userId,
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
    console.log("SEND ERROR:", err.message);
  }
}

// ===============================
// FIND PRODUCT
// ===============================
function findProduct(name, gsm = "") {
  const matches = products.filter(
    p => p.name.toLowerCase() === name.toLowerCase()
  );

  if (matches.length === 0) return null;

  if (gsm) {
    return matches.find(
      p => p.gsm.toLowerCase() === gsm.toLowerCase()
    );
  }

  if (matches.length === 1) return matches[0];

  return {
    needGsm: true,
    options: matches
  };
}

// ===============================
// PRICE ENGINE
// ===============================
function getUnitPrice(product, qty) {
  if (qty >= 300 && product.prices["300"]) return product.prices["300"];
  if (qty >= 200 && product.prices["200"]) return product.prices["200"];
  if (qty >= 100 && product.prices["100"]) return product.prices["100"];
  return product.prices["1"];
}

// ===============================
// PARSE ORDER
// ===============================
function parseOrder(raw = "") {
  let text = cleanText(raw);

  text = text.replace("ဈေးတွက်ပေးပါ", "").trim();

  const qtyMatch = text.match(/(\d+)\s*(ရွက်|pcs|pc)?$/);
  let qty = null;

  if (qtyMatch) {
    qty = parseInt(qtyMatch[1]);
    text = text.replace(qtyMatch[0], "").trim();
  }

  const gsmMatch = text.match(/(\d+g)/);
  let gsm = "";

  if (gsmMatch) {
    gsm = gsmMatch[1];
    text = text.replace(gsmMatch[1], "").trim();
  }

  const name = text.replace(/\s+/g, " ").trim();

  return { name, gsm, qty };
}

// ===============================
// ORDER RESPONSE
// ===============================
function makeBill(product, qty) {
  const unit = getUnitPrice(product, qty);
  const total = unit * qty;

  return `🧾 ORDER
Material: ${product.name} ${product.gsm}
Qty: ${qty}
Unit: ${unit}
Total: ${total} MMK`;
}

// ===============================
// WEBHOOK
// ===============================
app.post("/", async (req, res) => {
  res.sendStatus(200);

  const body = req.body;

  if (!body.sender || !body.message) return;

  const userId = body.sender.id;
  const rawText = body.message.text || "";
  const text = cleanText(rawText);

  if (!sessions[userId]) sessions[userId] = {};
  const session = sessions[userId];

  // ===============================
  // START
  // ===============================
  if (text === "hi") {
    session.step = null;

    return sendMessage(
      userId,
      "🤖 POS Bot Ready\nဈေးတွက်ရန် 'ဈေးတွက်ပေးပါ' ရိုက်ပါ"
    );
  }

  // ===============================
  // MAIN ORDER FLOW
  // ===============================
  if (text.includes("ဈေးတွက်ပေးပါ")) {
    const order = parseOrder(rawText);

    if (!order.name) {
      session.step = "wait_material";

      return sendMessage(
        userId,
        "📦 Material ရိုက်ပါ\nဥပမာ:\nArt Paper 128g\nArt Card 300g\nမိတ္တူ A4"
      );
    }

    const product = findProduct(order.name, order.gsm);

    if (!product) {
      return sendMessage(userId, "❌ Material မတွေ့ပါ");
    }

    if (product.needGsm) {
      session.step = "wait_gsm";
      session.productName = order.name;

      const list = product.options.map(p => p.gsm).join(" / ");

      return sendMessage(
        userId,
        `📄 GSM ဘယ်လောက်လဲ?\n${list}`
      );
    }

    if (!order.qty) {
      session.step = "wait_qty";
      session.product = product;

      return sendMessage(userId, "🔢 Quantity ဘယ်လောက်လဲ?");
    }

    session.step = null;

    return sendMessage(userId, makeBill(product, order.qty));
  }

  // ===============================
  // WAIT MATERIAL
  // ===============================
  if (session.step === "wait_material") {
    const order = parseOrder(rawText);

    const product = findProduct(order.name, order.gsm);

    if (!product) {
      return sendMessage(userId, "❌ Material မတွေ့ပါ");
    }

    if (product.needGsm) {
      session.step = "wait_gsm";
      session.productName = order.name;

      const list = product.options.map(p => p.gsm).join(" / ");

      return sendMessage(
        userId,
        `📄 GSM ဘယ်လောက်လဲ?\n${list}`
      );
    }

    if (!order.qty) {
      session.step = "wait_qty";
      session.product = product;

      return sendMessage(userId, "🔢 Quantity ဘယ်လောက်လဲ?");
    }

    session.step = null;

    return sendMessage(userId, makeBill(product, order.qty));
  }

  // ===============================
  // WAIT GSM
  // ===============================
  if (session.step === "wait_gsm") {
    const gsm = cleanText(rawText);

    const product = findProduct(session.productName, gsm);

    if (!product) {
      return sendMessage(userId, "❌ GSM မတွေ့ပါ");
    }

    session.product = product;
    session.step = "wait_qty";

    return sendMessage(userId, "🔢 Quantity ဘယ်လောက်လဲ?");
  }

  // ===============================
  // WAIT QTY
  // ===============================
  if (session.step === "wait_qty") {
    const qty = parseInt(cleanText(rawText));

    if (isNaN(qty)) {
      return sendMessage(userId, "❌ Quantity မှန်အောင်ထည့်ပါ");
    }

    const product = session.product;

    session.step = null;

    return sendMessage(userId, makeBill(product, qty));
  }

  // ===============================
  // DEFAULT
  // ===============================
  return sendMessage(
    userId,
    "🤖 နားမလည်ပါ\nဈေးတွက်ရန် 'ဈေးတွက်ပေးပါ' ရိုက်ပါ"
  );
});

// ===============================
app.listen(PORT, () => {
  console.log("🚀 BOT V6.1 RUNNING", PORT);
  console.log("TOKEN OK:", !!TOKEN);
});