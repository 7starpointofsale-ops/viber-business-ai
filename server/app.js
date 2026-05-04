const express = require("express");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const app = express();
app.use(express.json());

// ===================== PATH =====================
const DB_PATH = path.join(__dirname, "../database/price.db.json");

// ===================== ADMIN =====================
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// ===================== LOAD DB =====================
function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ===================== API =====================
app.get("/api/prices", (req, res) => {
  res.json(loadDB());
});

app.post("/api/add-item", (req, res) => {
  const db = loadDB();
  const { category, item, type, size, side1, side2, fixedValue, fixedPrice } = req.body;

  let cat = db.categories.find(c => c.name === category);
  if (!cat) {
    cat = { name: category, items: [] };
    db.categories.push(cat);
  }

  let it = cat.items.find(i => i.name === item);
  if (!it) {
    it = { name: item, type: type || "table", prices: {} };
    cat.items.push(it);
  }

  it.type = type;

  if (type === "table") {
    it.prices[size] = {
      "1": Number(side1 || 0),
      "2": Number(side2 || 0)
    };
  }

  if (type === "fixed") {
    it.prices[fixedValue] = Number(fixedPrice || 0);
  }

  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/delete-item", (req, res) => {
  const db = loadDB();
  const { category, item } = req.body;

  const cat = db.categories.find(c => c.name === category);
  if (cat) {
    cat.items = cat.items.filter(i => i.name !== item);
  }

  saveDB(db);
  res.json({ ok: true });
});

// ===================== BOT LOGIC =====================
function handleMessage(text = "") {
  const msg = text.toLowerCase();

  if (msg === "hi" || msg === "hello" || msg === "မင်္ဂလာပါ") {
    return "Hello 👋 7Star Printing AI မှကြိုဆိုပါတယ်";
  }

  const db = loadDB();

  for (const cat of db.categories) {
    for (const item of cat.items) {
      if (msg.includes(item.name.toLowerCase())) {

        let reply = `📄 ${item.name}\n\n`;

        for (const key in item.prices) {
          const val = item.prices[key];

          if (typeof val === "object") {
            reply += `${key}:\n`;
            if (val["1"]) reply += `1 Side: ${val["1"]} Ks\n`;
            if (val["2"]) reply += `2 Side: ${val["2"]} Ks\n`;
            reply += "\n";
          } else {
            reply += `${key}: ${val} Ks\n`;
          }
        }

        return reply;
      }
    }
  }

  return "❌ Item မတွေ့ပါ";
}

// ===================== VIBER WEBHOOK =====================
app.post("/webhook", async (req, res) => {
  try {
    const event = req.body;

    if (event.event === "message") {
      const text = event.message.text;
      const sender = event.sender.id;

      const reply = handleMessage(text);

      await axios.post(
        "https://chatapi.viber.com/pa/send_message",
        {
          receiver: sender,
          type: "text",
          text: reply,
          sender: { name: "7 Star Sayar Gyi" }
        },
        {
          headers: {
            "X-Viber-Auth-Token": process.env.VIBER_TOKEN
          }
        }
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(200);
  }
});

// ===================== ROOT =====================
app.get("/", (req, res) => {
  res.send("🚀 Viber AI Running");
});

// ===================== START =====================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Server running on " + PORT);
});