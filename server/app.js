const express = require("express");
const bodyParser = require("body-parser");

const { loadDB, calculate } = require("./services/price.engine");
const { createOrder, generateInvoice } = require("./services/order.engine");

const app = express();
app.use(bodyParser.json());

// ---------- LOAD DB ----------
loadDB();

// ---------- HOME ----------
app.get("/", (req, res) => {
  res.send("🚀 7Star Bot Running");
});

// ---------- WEBHOOK ----------
app.post("/webhook", (req, res) => {
  const message = req.body?.message?.text || "";

  console.log("📩 Incoming:", message);

  let reply = "";
  const text = message.toLowerCase();

  // ---------- GREETING ----------
  if (["hi", "hello", "မင်္ဂလာပါ"].includes(text)) {
    reply = "Hello 👋 7Star Printing AI မှကြိုဆိုပါတယ်";
  }

  // ---------- MATH ----------
  else if (/^[0-9+\-*/().\s]+$/.test(message)) {
    try {
      reply = `🧮 Result: ${eval(message)}`;
    } catch {
      reply = "❌ မတွက်နိုင်ပါ";
    }
  }

  // ---------- ORDER COMMAND ----------
  else if (text.startsWith("order")) {
    const input = message.replace("order", "").trim();
    const result = createOrder(input);

    reply = result.message;
  }

  // ---------- INVOICE ----------
  else if (text.startsWith("invoice")) {
    const id = message.replace("invoice", "").trim();
    reply = generateInvoice(id);
  }

  // ---------- PRICE ENGINE ----------
  else {
    reply = calculate(message);
  }

  console.log("🤖 Reply:", reply);

  res.json({ reply });
});

// ---------- START ----------
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});