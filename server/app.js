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
    // GREETING
    // =======================
    if (["hi","hello","hey","မင်္ဂလာပါ"].includes(msg)) {
      reply = "👋 Welcome to 7Star Printing\nType service (eg. Vinyl)";
      await sendViberMessage(userId, reply);
      return res.sendStatus(200);
    }

    // =======================
    // STEP: ASK SIZE
    // =======================
    if (session.step === "ask_size") {
      session.data.size = msg;
      session.step = "ask_qty";

      reply = "🔢 Quantity ဘယ်နှစ်ခုလဲ?";
      await sendViberMessage(userId, reply);
      return res.sendStatus(200);
    }

    // =======================
    // STEP: ASK QTY
    // =======================
    if (session.step === "ask_qty") {
      session.data.qty = parseInt(msg) || 1;

      const item = session.data.item;
      const price = calculatePrice(item, session.data);

      session.data.price = price;
      session.step = "confirm";

      reply = `🧾 Order Preview

Service: ${item.name}
Size: ${session.data.size}
Qty: ${session.data.qty}
Price: ${price} Ks

Confirm? (yes / no)`;

      await sendViberMessage(userId, reply);
      return res.sendStatus(200);
    }

    // =======================
    // CONFIRM
    // =======================
    if (session.step === "confirm") {
      if (msg === "yes") {
        const order = createOrder(session.data);

        reply = `✅ Order Confirmed
ID: ${order.id}
Price: ${order.price} Ks`;

      } else {
        reply = "❌ Cancelled";
      }

      resetSession(userId);
      await sendViberMessage(userId, reply);
      return res.sendStatus(200);
    }

    // =======================
    // DETECT SERVICE
    // =======================
    let foundItem = null;

    db.categories.forEach(cat => {
      cat.items.forEach(item => {
        if (msg.includes(item.name.toLowerCase())) {
          foundItem = item;
        }
      });
    });

    if (!foundItem) {
      reply = "❌ Service မတွေ့ပါ";
      await sendViberMessage(userId, reply);
      return res.sendStatus(200);
    }

    // save context
    session.data.item = foundItem;

    if (foundItem.type === "sqft") {
      session.step = "ask_size";
      reply = "📏 Size ဘယ်လောက်လဲ? (eg. 3x6)";
    } else {
      session.step = "ask_qty";
      reply = "🔢 Quantity ဘယ်နှစ်ခုလဲ?";
    }

    await sendViberMessage(userId, reply);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Running v3 on " + PORT);
});