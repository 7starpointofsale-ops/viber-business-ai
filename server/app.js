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

const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// 🔥 ADMIN FIX (ONLY ADDITION - DO NOT TOUCH LOGIC)
// =======================
const ADMIN_PATH = path.resolve(__dirname, "../admin");
app.use("/admin", express.static(ADMIN_PATH));

// =======================
// SEND VIBER
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
// SAFE MATH
// =======================
function isMath(msg) {
  return /^[0-9+\-*/().\s]+$/.test(msg);
}

function calc(msg) {
  try {
    if (isMath(msg)) {
      return `🧮 ${eval(msg)}`;
    }
  } catch {}
  return null;
}

// =======================
// WEBHOOK (UNCHANGED CORE LOGIC)
// =======================
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.event !== "message") return res.sendStatus(200);

  const userId = body.sender.id;
  const text = body.message.text || "";
  const msg = text.toLowerCase().trim();

  const session = getSession(userId);
  const db = JSON.parse(fs.readFileSync(DB_PATH));

  // =======================
  // GREETING (UNCHANGED)
  // =======================
  if (["hi","hello","hey","မင်္ဂလာပါ"].includes(msg)) {
    resetSession(userId);
    await send(userId, "👋 7Star System Ready\nType service (vinyl, card...)");
    return res.sendStatus(200);
  }

  // =======================
  // CALCULATOR (UNCHANGED)
  // =======================
  if (session.step === "idle") {
    const c = calc(msg);
    if (c) {
      await send(userId, c);
      return res.sendStatus(200);
    }
  }

  // =======================
  // SIZE STEP (UNCHANGED LOGIC)
  // =======================
  if (session.step === "ask_size") {

    const sizeMatch = msg.match(/(\d+)\s*[x*]\s*(\d+)/);
    if (sizeMatch) {
      session.data.size = `${sizeMatch[1]}x${sizeMatch[2]}`;
    } else {
      session.data.size = msg;
    }

    session.step = "ask_qty";

    await send(userId, "🔢 Quantity?");
    return res.sendStatus(200);
  }

  // =======================
  // QTY STEP
  // =======================
  if (session.step === "ask_qty") {

    session.data.qty = parseInt(msg) || 1;

    const item = session.data.item;
    const price = calculatePrice(item, session.data);

    session.data.price = price;
    session.step = "confirm";

    await send(userId,
`🧾 Preview
Service: ${item.name}
Size: ${session.data.size || "-"}
Qty: ${session.data.qty}
Price: ${price}

Confirm? (yes/no)`
    );

    return res.sendStatus(200);
  }

  // =======================
  // CONFIRM
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
  // SERVICE MATCH (IMPROVED BUT SAME LOGIC)
  // =======================
  let found = null;

  db.categories.forEach(c => {
    c.items.forEach(i => {

      const name = i.name.toLowerCase();

      if (
        msg === name ||
        msg.includes(name) ||
        name.includes(msg.split(" ")[0])
      ) {
        found = i;
      }

    });
  });

  if (!found) {
    await send(userId, "❌ Service မတွေ့ပါ\nTry: vinyl / card / stamp");
    return res.sendStatus(200);
  }

  session.data.item = found;

  if (found.type === "sqft") {
    session.step = "ask_size";
    await send(userId, "📏 Size? (eg. 3x6)");
  } else {
    session.step = "ask_qty";
    await send(userId, "🔢 Quantity?");
  }

  res.sendStatus(200);
});

// =======================
// HOME
// =======================
app.get("/", (req, res) => {
  res.send("🚀 7Star System Running");
});

// =======================
// PRICE API
// =======================
app.get("/api/prices", (req, res) => {
  res.json(JSON.parse(fs.readFileSync(DB_PATH)));
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 v6 FIXED RUNNING");
  console.log("📁 Admin:", ADMIN_PATH);
});