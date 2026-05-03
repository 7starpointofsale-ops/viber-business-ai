const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const { loadDB, getPrice } = require("./services/price.engine");

const app = express();

app.use(bodyParser.json());

loadDB();

// health
app.get("/", (req, res) => {
  res.send("🚀 7Star AI Running");
});

// webhook
app.post("/webhook", async (req, res) => {
  try {
    const event = req.body;

    if (!event || event.event !== "message") return res.sendStatus(200);

    const text = event.message.text;
    const sender = event.sender.id;

    console.log("📩 Incoming:", text);

    const reply = handle(text);

    await send(sender, reply);

    res.sendStatus(200);
  } catch (e) {
    console.log("ERROR:", e.message);
    res.sendStatus(200);
  }
});

// MAIN LOGIC
function handle(text) {
  const msg = text.toLowerCase();

  // greeting
  if (["hi", "hello", "မင်္ဂလာပါ"].includes(msg)) {
    return "Hello 👋 7Star Printing AI မှကြိုဆိုပါတယ်";
  }

  // math
  if (msg.match(/[0-9]+\s*[\+\-\*\/]\s*[0-9]+/)) {
    try {
      return "🧮 Result: " + eval(msg);
    } catch {
      return "❌ math error";
    }
  }

  // PRICE
  const price = getPrice(text);
  if (price) return price;

  return "❌ Item မတွေ့ပါ";
}

// send message
async function send(receiver, text) {
  try {
    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver,
        type: "text",
        text,
        sender: { name: "7Star AI" }
      },
      {
        headers: {
          "X-Viber-Auth-Token": process.env.VIBER_TOKEN
        }
      }
    );
  } catch (e) {
    console.log("SEND ERROR:", e.message);
  }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Server running", PORT));