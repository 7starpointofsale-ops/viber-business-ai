const express = require("express");
const bodyParser = require("body-parser");
const { loadDB, calculate } = require("./services/price.engine");

const app = express();

app.use(bodyParser.json());

// ---------- LOAD DB ON START ----------
loadDB();

// ---------- HEALTH CHECK ----------
app.get("/", (req, res) => {
  res.send("🚀 Bot is running");
});

// ---------- VIBER WEBHOOK ----------
app.post("/webhook", (req, res) => {
  try {
    const message = req.body?.message?.text || req.body?.text;

    if (!message) {
      return res.sendStatus(200);
    }

    console.log("📩 Incoming:", message);

    let reply = "";

    // ---------- GREETING ----------
    const text = message.toLowerCase();

    if (["hi", "hello", "မင်္ဂလာပါ"].includes(text)) {
      reply = "Hello 👋 7Star Printing AI မှကြိုဆိုပါတယ်";
    }

    // ---------- MATH ----------
    else if (/^[0-9+\-*/().\s]+$/.test(message)) {
      try {
        const result = eval(message);
        reply = `🧮 Result: ${result}`;
      } catch {
        reply = "❌ မတွက်နိုင်ပါ";
      }
    }

    // ---------- PRICE ENGINE ----------
    else {
      reply = calculate(message);
    }

    console.log("🤖 Reply:", reply);

    // 👉 Viber send (placeholder)
    res.json({
      reply: reply
    });

  } catch (err) {
    console.error("ERROR:", err.message);
    res.sendStatus(500);
  }
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});