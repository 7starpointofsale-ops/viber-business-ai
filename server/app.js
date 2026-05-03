const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const path = require("path");

const { loadDB, getPrice } = require("./services/price.engine");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ======================
// LOAD DB
// ======================
loadDB();

// ======================
// ADMIN PANEL STATIC
// ======================
app.use("/admin", express.static(path.join(__dirname, "../admin")));

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../admin/index.html"));
});

// ======================
// API - GET PRICES
// ======================
app.get("/api/prices", (req, res) => {
  const db = require("./database/price.db.json");
  res.json(db);
});

// ======================
// API - ADD ITEM (SIMPLE VERSION)
// ======================
app.post("/api/add-item", (req, res) => {
  const fs = require("fs");

  const dbPath = path.join(__dirname, "./database/price.db.json");
  const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

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

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

  res.json({ success: true });
});

// ======================
// API - DELETE ITEM
// ======================
app.post("/api/delete-item", (req, res) => {
  const fs = require("fs");

  const dbPath = path.join(__dirname, "./database/price.db.json");
  const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

  const { category, item, size } = req.body;

  const cat = db.categories.find(c => c.name === category);
  if (!cat) return res.json({ success: false });

  const it = cat.items.find(i => i.name === item);
  if (!it) return res.json({ success: false });

  delete it.sizes[size];

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

  res.json({ success: true });
});

// ======================
// VIBER WEBHOOK
// ======================
app.post("/webhook", async (req, res) => {
  const event = req.body;

  if (!event || event.event !== "message") {
    return res.sendStatus(200);
  }

  const text = event.message.text;
  const sender = event.sender.id;

  let reply = handleMessage(text);

  await sendMessage(sender, reply);

  res.sendStatus(200);
});

// ======================
// MESSAGE HANDLER
// ======================
function handleMessage(text = "") {
  const msg = text.toLowerCase();

  if (msg === "hi" || msg === "hello" || msg === "မင်္ဂလာပါ") {
    return "Hello 👋 7Star Printing AI မှကြိုဆိုပါတယ်";
  }

  if (msg.includes("+") || msg.includes("-") || msg.includes("*") || msg.includes("/")) {
    try {
      const result = eval(msg.replace(/[^0-9+\-*/(). ]/g, ""));
      return `🧮 Result: ${result}`;
    } catch {
      return "❌ Invalid math";
    }
  }

  const price = getPrice(text);
  if (price) return price;

  return "❌ Item မတွေ့ပါ";
}

// ======================
// VIBER SEND
// ======================
async function sendMessage(receiver, text) {
  try {
    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver,
        type: "text",
        text,
        sender: { name: "7 Star Sayar Gyi" }
      },
      {
        headers: {
          "X-Viber-Auth-Token": process.env.VIBER_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (err) {
    console.error(err.message);
  }
}

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});