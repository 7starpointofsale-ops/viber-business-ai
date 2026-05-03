const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const { loadDB, getPrice } = require("./services/price.engine");

const app = express();

// middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ===============================
// LOAD DATABASE ON START
// ===============================
loadDB();

// ===============================
// HEALTH CHECK
// ===============================
app.get("/", (req, res) => {
  res.send("🚀 Viber Business AI is running");
});

// ===============================
// VIBER WEBHOOK
// ===============================
app.post("/webhook", async (req, res) => {
  try {
    const event = req.body;

    console.log("📩 Incoming:", JSON.stringify(event, null, 2));

    if (!event || !event.event) {
      return res.sendStatus(200);
    }

    // MESSAGE EVENT
    if (event.event === "message") {
      const message = event.message.text;
      const senderId = event.sender.id;

      let reply = handleMessage(message);

      await sendMessage(senderId, reply);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err.message);
    res.sendStatus(200);
  }
});

// ===============================
// MESSAGE HANDLER
// ===============================
function handleMessage(text = "") {
  const msg = text.toLowerCase().trim();

  console.log("🤖 Processing:", msg);

  // greeting
  if (msg === "hi" || msg === "hello" || msg === "မင်္ဂလာပါ") {
    return "Hello 👋 7Star Printing AI မှကြိုဆိုပါတယ်";
  }

  // math support
  if (msg.includes("+") || msg.includes("-") || msg.includes("*") || msg.includes("/")) {
    try {
      const result = eval(msg.replace(/[^0-9+\-*/(). ]/g, ""));
      return `🧮 Result: ${result}`;
    } catch {
      return "❌ Invalid math";
    }
  }

  // price engine
  const price = getPrice(text);
  if (price) return price;

  return "❌ Item မတွေ့ပါ";
}

// ===============================
// SEND MESSAGE TO VIBER
// ===============================
async function sendMessage(receiver, text) {
  try {
    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver: receiver,
        min_api_version: 1,
        sender: {
          name: "7 Star Sayar Gyi",
          avatar: ""
        },
        type: "text",
        text: text
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Viber-Auth-Token": process.env.VIBER_TOKEN
        }
      }
    );
  } catch (err) {
    console.error("❌ SEND ERROR:", err.response?.data || err.message);
  }
}

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});