const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const path = require("path");

const { loadDB, getPrice } = require("./services/price.engine");

const app = express();

app.use(bodyParser.json());

// =====================
// LOAD DB
// =====================
loadDB();

// =====================
// STATIC ADMIN PANEL
// =====================
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =====================
// HEALTH CHECK
// =====================
app.get("/", (req, res) => {
  res.send("🚀 7Star Bot Running");
});

// =====================
// API (ADMIN USE)
// =====================
const fs = require("fs");
const DB_PATH = path.join(__dirname, "../database/price.db.json");

app.get("/api/prices", (req, res) => {
  const data = fs.readFileSync(DB_PATH, "utf8");
  res.json(JSON.parse(data));
});

// =====================
// ADD ITEM
// =====================
app.post("/api/add-item", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));

  const { category, item, size, side1, side2 } = req.body;

  let cat = db.categories.find(c => c.name === category);
  if (!cat) {
    cat = { name: category, items: [] };
    db.categories.push(cat);
  }

  let it = cat.items.find(i => i.name === item);
  if (!it) {
    it = { name: item, sizes: {} };
    cat.items.push(it);
  }

  it.sizes[size] = {
    "1": Number(side1),
    "2": Number(side2)
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  res.json({ success: true });
});

// =====================
// DELETE ITEM
// =====================
app.post("/api/delete-item", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));

  const { category, item, size } = req.body;

  const cat = db.categories.find(c => c.name === category);
  if (!cat) return res.json({ ok: false });

  const it = cat.items.find(i => i.name === item);
  if (!it) return res.json({ ok: false });

  delete it.sizes[size];

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  res.json({ ok: true });
});

// =====================
// VIBER WEBHOOK
// =====================
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

// =====================
// MESSAGE HANDLER
// =====================
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

// =====================
// SEND VIBER
// =====================
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

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});