require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { products } = require("./data");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.VIBER_TOKEN;

// ===============================
// USER SESSION MEMORY
// ===============================
const sessions = {};

// ===============================
// MYANMAR NUMBER CONVERT
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

  return text.replace(/[၀-၉]/g, m => map[m]);
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
        text: text
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
  return products.find(p => {
    const nameMatch = p.name.toLowerCase() === name.toLowerCase();
    const gsmMatch = gsm ? p.gsm.toLowerCase() === gsm.toLowerCase() : true;
    return nameMatch && gsmMatch;
  });
}

// ===============================
// GET UNIT PRICE BY QTY
// ===============================
function getUnitPrice(product, qty) {
  const priceTable = product.prices;

  if (qty >= 300 && priceTable["300"]) return priceTable["300"];
  if (qty >= 200 && priceTable["200"]) return priceTable["200"];
  if (qty >= 100 && priceTable["100"]) return priceTable["100"];

  return priceTable["1"];
}

// ===============================
// SMART PARSE INPUT
// ===============================
function parseOrder(text) {
  text = cleanText(text);

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
    text = text.replace(gsm, "").trim();
  }

  let name = text
    .replace(/\s+/g, " ")
    .trim();

  return {
    name,
    gsm,
    qty
  };
}

// ===============================
// MAIN MESSAGE HANDLER
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
  // FULL ONE LINE ORDER
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
      session.step = null;
      return sendMessage(userId, "❌ Material မတွေ့ပါ");
    }

    if (!order.gsm && product.gsm) {
      session.productName = product.name;
      session.step = "wait_gsm";

      const options = products
        .filter(p => p.name === product.name)
        .map(p => p.gsm)
        .join(" / ");

      return sendMessage(userId, `📄 GSM ဘယ်လောက်လဲ?\n${options}`);
    }

    if (!order.qty) {
      session.product = product;
      session.step = "wait_qty";

      return sendMessage(userId, "🔢 Quantity ဘယ်လောက်လဲ?");
    }

    const unit = getUnitPrice(product, order.qty);
    const total = unit * order.qty;

    session.step = null;

    return sendMessage(
      userId,
      `🧾 ORDER
Material: ${product.name} ${product.gsm}
Qty: ${order.qty}
Unit: ${unit}
Total: ${total} MMK`
    );
  }

  // ===============================
  // WAIT MATERIAL
  // ===============================
  if (session.step === "wait_material") {
    const order = parseOrder(rawText);

    const product = findProduct(order.name, order.gsm);

    if (!product) return sendMessage(userId, "❌ Material မတွေ့ပါ");

    if (!order.qty) {
      session.product = product;
      session.step = "wait_qty";

      return sendMessage(userId, "🔢 Quantity ဘယ်လောက်လဲ?");
    }

    const unit = getUnitPrice(product, order.qty);
    const total = unit * order.qty;

    session.step = null;

    return sendMessage(
      userId,
      `🧾 ORDER
Material: ${product.name} ${product.gsm}
Qty: ${order.qty}
Unit: ${unit}
Total: ${total} MMK`
    );
  }

  // ===============================
  // WAIT GSM
  // ===============================
  if (session.step === "wait_gsm") {
    const gsm = cleanText(rawText);

    const product = findProduct(session.productName, gsm);

    if (!product) return sendMessage(userId, "❌ GSM မတွေ့ပါ");

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
    const unit = getUnitPrice(product, qty);
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
  console.log("🚀 BOT V6 RUNNING", PORT);
  console.log("TOKEN OK:", !!TOKEN);
});