const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const { parseMessage } = require("./services/parser");
const { calculatePrice } = require("./services/rule.engine");
const { createOrder } = require("./services/order.service");
const { getSession, resetSession } = require("./services/session.store");

require("dotenv").config();

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// VIBER SEND
// =======================
async function sendViberMessage(userId, text) {
  await axios.post("https://chatapi.viber.com/pa/send_message", {
    receiver: userId,
    type: "text",
    text: text
  }, {
    headers: {
      "X-Viber-Auth-Token": process.env.VIBER_TOKEN
    }
  });
}

// =======================
app.get("/", (req, res) => {
  res.send("🔥 7Star PRO v2.1 RUNNING");
});

// =======================
// WEBHOOK
// =======================
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.event === "message") {
    const userId = body.sender.id;
    const text = body.message.text || "";
    const msg = text.toLowerCase().trim();

    const session = getSession(userId);
    const db = JSON.parse(fs.readFileSync(DB_PATH));

    let reply = "";

    // =======================
    // GREETING FIX ✅
    // =======================
    const greetings = ["hi", "hello", "hey", "မင်္ဂလာပါ"];

    if (greetings.includes(msg)) {
      reply = "👋 7Star Printing မှ ကြိုဆိုပါတယ်\n\nလိုချင်တဲ့ service ရိုက်ထည့်ပါ (eg. Vinyl 3x6 2)";
      await sendViberMessage(userId, reply);
      return res.sendStatus(200);
    }

    // =======================
    // CONFIRM STEP
    // =======================
    if (session.step === "confirm") {
      if (msg === "yes") {
        const order = createOrder(session.data);

        reply = `✅ Order Confirmed
ID: ${order.id}
Service: ${order.service}
Qty: ${order.qty}
Price: ${order.price} Ks`;

        resetSession(userId);
      } else {
        reply = "❌ Order Cancelled";
        resetSession(userId);
      }

      await sendViberMessage(userId, reply);
      return res.sendStatus(200);
    }

    // =======================
    // NORMAL FLOW
    // =======================
    const parsed = parseMessage(msg);

    let foundItem = null;

    db.categories.forEach(cat => {
      cat.items.forEach(item => {
        if (msg.includes(item.name.toLowerCase())) {
          foundItem = item;
        }
      });
    });

    if (!foundItem) {
      reply = "❌ Service မတွေ့ပါ\n\nဥပမာ:\nVinyl 3x6 2";
      await sendViberMessage(userId, reply);
      return res.sendStatus(200);
    }

    if (foundItem.type === "sqft" && !parsed.size) {
      reply = "📏 Size ဘယ်လောက်လဲ? (eg. 3x6)";
      await sendViberMessage(userId, reply);
      return res.sendStatus(200);
    }

    const price = calculatePrice(foundItem, parsed);

    session.step = "confirm";
    session.data = {
      service: foundItem.name,
      qty: parsed.qty,
      price
    };

    reply = `🧾 Order Preview

Service: ${foundItem.name}
Qty: ${parsed.qty}
Price: ${price} Ks

Confirm? (yes / no)`;

    await sendViberMessage(userId, reply);
  }

  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Running on " + PORT);
});