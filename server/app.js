const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const DB_PATH = path.join(__dirname, "../database/price.db.json");
const ORDER_DB = path.join(__dirname, "../database/orders.db.json");

app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =======================
// SAFE FILE HELPERS
// =======================
function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.log("WRITE ERROR:", e.message);
  }
}

// =======================
// CACHE
// =======================
let dbCache = null;
let orderCache = null;
let lastDB = 0;

function loadDB() {
  const now = Date.now();
  if (dbCache && now - lastDB < 3000) return dbCache;

  dbCache = readJSON(DB_PATH, { categories: [] });
  lastDB = now;
  return dbCache;
}

function loadOrders() {
  if (!orderCache) {
    orderCache = readJSON(ORDER_DB, { orders: [] });
  }
  return orderCache;
}

function saveOrders(data) {
  orderCache = data;
  writeJSON(ORDER_DB, data);
}

// =======================
// CLEAN
// =======================
function clean(msg) {
  return (msg || "")
    .replace(/[📁📄💰🧮📦🧾]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

// =======================
// BURMESE NUMBER
// =======================
function normalizeNumber(msg) {
  const map = {
    "၀":"0","၁":"1","၂":"2","၃":"3","၄":"4",
    "၅":"5","၆":"6","၇":"7","၈":"8","၉":"9"
  };

  return (msg || "")
    .split("")
    .map(c => map[c] ?? c)
    .join("");
}

function isNumber(msg) {
  return /^\d+$/.test(normalizeNumber(msg));
}

// =======================
// ORDER ENGINE (NEW CORE)
// =======================
function createOrder({ userId, text }) {

  const orders = loadOrders();

  const urgent = text.toLowerCase().includes("urgent");

  const order = {
    id: "ORD-" + Date.now(),
    userId,
    text,
    status: "NEW",
    staff: assignStaff(urgent),
    urgent,
    createdAt: new Date().toISOString()
  };

  orders.orders.push(order);

  saveOrders(orders);

  return order;
}

// =======================
// STAFF RULE
// =======================
function assignStaff(urgent) {

  const staff = ["A", "B", "C", "D"];

  if (urgent) return "A";

  return staff[Math.floor(Math.random() * staff.length)];
}

// =======================
// SEND
// =======================
async function send(userId, text, keyboard = null) {

  try {
    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver: userId,
        type: "text",
        text,
        keyboard,
        min_api_version: 7
      },
      {
        headers: {
          "X-Viber-Auth-Token": process.env.VIBER_TOKEN
        },
        timeout: 10000
      }
    );
  } catch (e) {
    console.log("Viber Error:", e.message);
  }
}

// =======================
// WEBHOOK
// =======================
app.post("/webhook", async (req, res) => {

  try {

    if (req.body.event !== "message") return res.sendStatus(200);

    const userId = req.body.sender.id;
    const rawMsg = req.body.message.text || "";

    const msg = clean(rawMsg);

    // ======================
    // CREATE ORDER ALWAYS
    // ======================
    const order = createOrder({
      userId,
      text: rawMsg
    });

    // ======================
    // RESPONSE
    // ======================
    await send(
      userId,
`📦 Order Received

ID: ${order.id}
Status: ${order.status}
Staff: ${order.staff}
Urgent: ${order.urgent ? "🔥 YES" : "NO"}

We will process soon.`
    );

    return res.sendStatus(200);

  } catch (e) {
    console.log(e);
    return res.sendStatus(200);
  }
});

// =======================
// DASHBOARD API
// =======================
app.get("/api/dashboard", (req, res) => {
  res.json(loadOrders());
});

// =======================
// STATUS UPDATE
// =======================
app.post("/api/update-status", (req, res) => {

  const { id, status } = req.body;

  const orders = loadOrders();

  orders.orders.forEach(o => {
    if (o.id === id) {
      o.status = status;
    }
  });

  saveOrders(orders);

  res.json({ ok: true });
});

// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 7Star FULL CONTROL SYSTEM RUNNING");
});