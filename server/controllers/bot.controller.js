const priceEngine = require("../services/price.engine");

// =======================
// 🤖 MAIN BOT HANDLER
// =======================
exports.handleMessage = async (req, res) => {
  try {
    const message = req.body?.message?.text || req.body?.text || "";

    console.log("📩 Incoming:", message);

    if (!message) {
      return res.json({
        reply: "❌ Empty message"
      });
    }

    // =======================
    // 🔥 PRICE ENGINE CHECK
    // =======================
    const priceReply = priceEngine(message);

    if (priceReply) {
      return res.json({
        reply: priceReply
      });
    }

    // =======================
    // 💬 DEFAULT RESPONSES
    // =======================
    const text = message.toLowerCase();

    if (text.includes("hi") || text.includes("hello")) {
      return res.json({
        reply: "Hello 👋 7Star Printing AI မှကြိုဆိုပါတယ်"
      });
    }

    if (text.includes("order")) {
      return res.json({
        reply:
          "📦 Order လုပ်ရန်:\n" +
          "1️⃣ Item name\n" +
          "2️⃣ Size\n" +
          "3️⃣ Quantity\n" +
          "4️⃣ Phone number ပို့ပေးပါ"
      });
    }

    if (text.includes("price") || text.includes("ဈေး")) {
      return res.json({
        reply: "📌 Item name သို့မဟုတ် product name ရိုက်ပေးပါ"
      });
    }

    // =======================
    // ❌ FALLBACK
    // =======================
    return res.json({
      reply: "❌ မတွေ့ပါ\n📌 ထပ်မေးပေးပါ"
    });
  } catch (err) {
    console.log("❌ BOT ERROR:", err.message);

    return res.json({
      reply: "⚠️ System Error"
    });
  }
};