const express = require("express");
const fs = require("fs");
const path = require("path");

const { parseMessage } = require("./services/parser");
const { calculatePrice } = require("./services/rule.engine");
const { createOrder } = require("./services/order.service");

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
app.get("/", (req, res) => {
  res.send("🔥 7Star PRO SYSTEM RUNNING");
});

// =======================
// VIBER WEBHOOK (UPGRADED)
// =======================
app.post("/webhook", (req, res) => {
  const body = req.body;

  if (body.event === "message") {
    const text = body.message.text || "";
    const msg = text.toLowerCase();

    const db = JSON.parse(fs.readFileSync(DB_PATH));

    const parsed = parseMessage(msg);

    let foundItem = null;

    db.categories.forEach(cat => {
      cat.items.forEach(item => {
        if (msg.includes(item.name.toLowerCase())) {
          foundItem = item;
        }
      });
    });

    let reply = "";

    // =======================
    if (!foundItem) {
      reply = "❌ Service မတွေ့ပါ";
    }

    else if (!parsed.size && foundItem.type === "sqft") {
      reply = "📏 Size ဘယ်လောက်လဲ? (eg. 3x6)";
    }

    else {
      const price = calculatePrice(foundItem, parsed);

      const order = createOrder({
        service: foundItem.name,
        qty: parsed.qty,
        price
      });

      reply = `✅ Order Created
ID: ${order.id}
Service: ${order.service}
Qty: ${order.qty}
Price: ${order.price} Ks
Status: ${order.status}`;
    }

    console.log("User:", text);
    console.log("Bot:", reply);
  }

  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Running on " + PORT);
});