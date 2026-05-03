const priceEngine = require("../services/price.engine");

exports.handleMessage = async (req, res) => {
  try {
    const message = req.body?.message?.text || req.body?.text || "";

    console.log("📩 Incoming:", message);

    if (!message) {
      return res.json({ reply: "❌ Empty message" });
    }

    // 🔥 PRICE ENGINE
    const priceReply = priceEngine(message);
    if (priceReply) {
      return res.json({ reply: priceReply });
    }

    // 💬 BASIC RESPONSES
    const text = message.toLowerCase();

    if (text.includes("hi")) {
      return res.json({
        reply: "Hello 👋 7Star Printing AI မှကြိုဆိုပါတယ်"
      });
    }

    if (text.includes("order")) {
      return res.json({
        reply:
          "📦 Order:\n1️⃣ Item\n2️⃣ Size\n3️⃣ Qty\n4️⃣ Phone"
      });
    }

    return res.json({
      reply: "❌ မတွေ့ပါ"
    });

  } catch (err) {
    console.log("❌ ERROR:", err.message);

    return res.json({
      reply: "⚠️ System Error"
    });
  }
};