const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const { parseMessage } = require("./services/parser");
const { calculatePrice } = require("./services/rule.engine");
const { createOrder } = require("./services/order.service");
const { getSession, resetSession } = require("./services/session.store");
const { readOrders, saveOrders } = require("./services/store");

require("dotenv").config();

const app = express();
app.use(express.json());

const PRICE_DB = path.join(__dirname, "../database/price.db.json");

// =======================
// VIBER SEND
// =======================
async function send(userId, text) {
  await axios.post("https://chatapi.viber.com/pa/send_message", {
    receiver: userId,
    type: "text",
    text
  }, {
    headers: {
      "X-Viber-Auth-Token": process.env.VIBER_TOKEN
    }
  });
}

// =======================
// CALC
// =======================
function calc(msg) {
  try {
    if (/^[0-9+\-*/().\s]+$/.test(msg)) {
      return `🧮 ${eval(msg)}`;
    }
  } catch {}
  return null;
}

// =======================
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.event !== "message") return res.sendStatus(200);

  const userId = body.sender.id;
  const text = body.message.text || "";
  const msg = text.toLowerCase().trim();

  const session = getSession(userId);
  const db = JSON.parse(fs.readFileSync(PRICE_DB));

  // =======================
  // CALCULATOR
  // =======================
  const c = calc(msg);
  if (c) {
    await send(userId, c);
    return res.sendStatus(200);
  }

  // =======================
  // GREETING
  // =======================
  if (["hi","hello","hey","မင်္ဂလာပါ"].includes(msg)) {
    await send(userId, "👋 7Star System Ready\nType service (vinyl, card...)");
    return res.sendStatus(200);
  }

  // =======================
  // CONFIRM STEP
  // =======================
  if (session.step === "confirm") {
    if (msg === "yes") {
      const orders = readOrders();

      const order = createOrder(session.data);
      orders.orders.push(order);

      saveOrders(orders);

      await send(userId, `✅ ORDER CREATED\nID: ${order.id}`);
    } else {
      await send(userId, "❌ Cancelled");
    }

    resetSession(userId);
    return res.sendStatus(200);
  }

  // =======================
  // FIND ITEM (SMART MATCH)
  // =======================
  let item = null;

  db.categories.forEach(c => {
    c.items.forEach(i => {
      if (msg.includes(i.name.toLowerCase()) || i.name.toLowerCase().includes(msg)) {
        item = i;
      }
    });
  });

  if (!item) {
    await send(userId, "❌ Service မတွေ့ပါ");
    return res.sendStatus(200);
  }

  session.data.item = item;

  // =======================
  // FLOW CONTROL
  // =======================
  if (item.type === "sqft") {
    session.step = "ask_size";
    await send(userId, "📏 Size?");
    return res.sendStatus(200);
  }

  session.step = "ask_qty";
  await send(userId, "🔢 Quantity?");
  res.sendStatus(200);
});

// =======================
// SIZE STEP
// =======================
app.post("/webhook-size", async (req, res) => {
  const { userId, text } = req.body;

  const session = getSession(userId);

  session.data.size = text;
  session.step = "ask_qty";

  await send(userId, "🔢 Quantity?");
  res.sendStatus(200);
});

// =======================
// QTY STEP
// =======================
app.post("/webhook-qty", async (req, res) => {
  const { userId, text } = req.body;

  const session = getSession(userId);
  const item = session.data.item;

  session.data.qty = parseInt(text) || 1;

  const price = calculatePrice(item, session.data);
  session.data.price = price;

  session.step = "confirm";

  await send(userId,
`🧾 Preview
Service: ${item.name}
Qty: ${session.data.qty}
Price: ${price}

Confirm? (yes/no)`
  );

  res.sendStatus(200);
});

// =======================
app.get("/api/orders", (req, res) => {
  res.json(readOrders());
});

app.post("/api/update-status", (req, res) => {
  const { id, status } = req.body;

  const db = readOrders();

  const o = db.orders.find(x => x.id === id);
  if (o) o.status = status;

  saveOrders(db);

  res.json({ ok: true });
});

// =======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 v5 SYSTEM RUNNING");
});