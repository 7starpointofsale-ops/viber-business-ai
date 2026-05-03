const axios = require("axios");
const priceEngine = require("../services/price.engine");

const VIBER_TOKEN = process.env.VIBER_TOKEN;

// 🔥 FIXED SENDER
async function sendMessage(receiver, text) {
  try {
    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver,
        min_api_version: 1,
        sender: {
          name: "7 Star AI"
        },
        type: "text",
        text
      },
      {
        headers: {
          "X-Viber-Auth-Token": VIBER_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (err) {
    console.log("❌ VIBER SEND ERROR:", err.response?.data || err.message);
  }
}

// ----------------------------
// MAIN HANDLER
// ----------------------------
exports.handleMessage = async (req, res) => {
  try {
    const event = req.body;

    if (!event || !event.message) {
      return res.sendStatus(200);
    }

    const text = event.message.text || "";
    const sender = event.sender?.id;

    console.log("📩 Incoming:", text);

    let reply = "";

    // 🔥 SIMPLE AI ROUTING
    if (text.toLowerCase().includes("hi")) {
      reply = "Hello 👋 7Star Printing AI မှကြိုဆိုပါတယ်";
    } else if (text.includes("ဈေး")) {
      reply = "📦 Item name + size + quantity ပို့ပါ";
    } else {
      reply = priceEngine(text);
    }

    if (sender) {
      await sendMessage(sender, reply);
    }

    res.sendStatus(200);
  } catch (err) {
    console.log("❌ BOT ERROR:", err.message);
    res.sendStatus(200);
  }
};