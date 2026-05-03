const priceEngine = require("../services/price.engine");

// Viber response helper
function sendMessage(res, text) {
  res.json({
    status: 0,
    messages: [
      {
        type: "text",
        text: text
      }
    ]
  });
}

exports.handleMessage = (req, res) => {
  try {
    const message = req.body.message?.text || "";

    console.log("📩 Incoming:", message);

    if (!message) {
      return sendMessage(res, "Hello 👋");
    }

    // price check
    const reply = priceEngine(message);

    return sendMessage(res, reply);

  } catch (err) {
    console.log("BOT ERROR:", err);
    return sendMessage(res, "❌ Server error");
  }
};