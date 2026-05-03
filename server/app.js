const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const { loadDB, getPrice } = require("./services/price.engine");

const app = express();

app.use(bodyParser.json());

loadDB();

// HEALTH
app.get("/", (req, res) => {
  res.send("🚀 Bot Running");
});

// WEBHOOK
app.post("/webhook", async (req, res) => {
  try {
    const event = req.body;

    if (!event || event.event !== "message") {
      return res.sendStatus(200);
    }

    const text = event.message.text;
    const sender = event.sender.id;

    const reply = handle(text);

    await send(sender, reply);

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(200);
  }
});

function handle(text) {
  const msg = text.toLowerCase();

  if (msg === "hi" || msg === "hello" || msg === "မင်္ဂလာပါ") {
    return "Hello 👋 7Star Printing AI";
  }

  if (msg.includes("+") || msg.includes("-") || msg.includes("*") || msg.includes("/")) {
    try {
      return "🧮 Result: " + eval(msg);
    } catch {
      return "❌ math error";
    }
  }

  const price = getPrice(text);
  if (price) return price;

  return "❌ Item မတွေ့ပါ";
}

async function send(receiver, text) {
  await axios.post(
    "https://chatapi.viber.com/pa/send_message",
    {
      receiver,
      type: "text",
      text
    },
    {
      headers: {
        "X-Viber-Auth-Token": process.env.VIBER_TOKEN
      }
    }
  );
}

app.listen(10000, () => {
  console.log("🚀 running");
});