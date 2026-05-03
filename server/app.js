const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const { loadDB, getPrice } = require("./services/price.engine");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ===============================
// SAFE DB LOAD (NO CRASH)
// ===============================
try {
  loadDB();
} catch (err) {
  console.error("❌ DB INIT FAILED:", err.message);
}

// ===============================
// HEALTH CHECK
// ===============================
app.get("/", (req, res) => {
  res.send("🚀 7Star Printing AI is running");
});

// ===============================
// WEBHOOK
// ===============================
app.post("/webhook", async (req, res) => {
  try {
    const event = req.body;

    console.log("📩 Incoming:", event?.message?.text || JSON.stringify(event));

    if (!event || !event.event) return res.sendStatus(200);

    if (event.event === "message") {
      const text = event.message.text || "";
      const senderId = event.sender.id;

      const reply = handleMessage(text);

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

  // greeting
  if (["hi", "hello", "မင်္ဂလာပါ"].includes(msg)) {
    return "Hello 👋 7Star Printing AI မှကြိုဆိုပါတယ်";
  }

  // math
  if (/[0-9]+\s*[\+\-\*\/]/.test(msg)) {
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
// SEND VIBER
// ===============================
async function sendMessage(receiver, text) {
  try {
    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver,
        min_api_version: 1,
        sender: {
          name: "7 Star Sayar Gyi",
        },
        type: "text",
        text
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Viber-Auth-Token": process.env.VIBER_TOKEN
        }
      }
    );
  } catch (err) {
    console.error("❌ SEND ERROR:", err.message);
  }
}

// ===============================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});