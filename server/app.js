const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const { sendMessage } = require("./services/viber.service");

const app = express();
app.use(bodyParser.json());

// HEALTH CHECK
app.get("/", (req, res) => {
  res.send("🚀 Viber Business AI Running");
});

// WEBHOOK
app.post("/webhook", async (req, res) => {
  const data = req.body;

  console.log("📩 Incoming:", data);

  const text = data?.message?.text?.toLowerCase();
  const userId = data?.sender?.id;

  if (!text || !userId) return res.sendStatus(200);

  let reply = "မင်္ဂလာပါ 👋 ဘာကူညီရမလဲ?";

  // =========================
  // 🤖 SMART PRINTING BOT
  // =========================

  // Greeting
  if (text.includes("hi") || text.includes("hello")) {
    reply = "Hello 👋 7Star Printing AI မှကြိုဆိုပါတယ်";
  }

  // PRICE SYSTEM
  else if (text.includes("art card 250")) {
    reply = "📄 Art Card 250g\n1 Side: 1900 Ks\n2 Side: 2500 Ks";
  }

  else if (text.includes("art card 300")) {
    reply = "📄 Art Card 300g\n1 Side: 2200 Ks\n2 Side: 2800 Ks";
  }

  else if (text.includes("digital press")) {
    reply = "🖨 Digital Press Price ရှာရန် A4 / 13x19 / Art Paper စမ်းပါ";
  }

  // ORDER SYSTEM
  else if (text.includes("order")) {
    reply =
      "📦 Order လုပ်ရန်:\n" +
      "1️⃣ Item name\n2️⃣ Size\n3️⃣ Quantity\n4️⃣ Phone number ပို့ပေးပါ";
  }

  // HELP
  else if (text.includes("help")) {
    reply =
      "🆘 Commands:\n" +
      "- hi\n- art card 250\n- art card 300\n- order\n- price";
  }

  // DEFAULT
  else {
    reply = "❓ မသိသေးပါ\n'help' ရိုက်ပြီး command ကြည့်ပါ";
  }

  // SEND TO VIBER
  await sendMessage(userId, reply);

  res.sendStatus(200);
});

// START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});