const express = require("express");
const fs = require("fs");
const path = require("path");

const { findItem, calculate } = require("./services/price.engine");

const app = express();
app.use(express.json());

// =======================
// PATH
// =======================
const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// HOME
// =======================
app.get("/", (req, res) => {
  res.send("✅ Viber AI Running");
});

// =======================
// GET ALL PRICES (ADMIN)
// =======================
app.get("/api/prices", (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    res.json(db);
  } catch (err) {
    console.log("API ERROR:", err);
    res.status(500).json({ error: "cannot read db" });
  }
});

// =======================
// ADD ITEM (ADMIN)
// =======================
app.post("/api/add-item", (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

    const { category, item, type, size, side1, side2, price } = req.body;

    let cat = db.categories.find(c => c.name === category);
    if (!cat) {
      cat = { name: category, items: [] };
      db.categories.push(cat);
    }

    let it = cat.items.find(i => i.name === item);
    if (!it) {
      it = { name: item, type: type, prices: {} };
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
      it.prices[size] = Number(price || 0);
    }

    if (type === "sqft") {
      it.price = Number(price || 0);
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    res.json({ ok: true });

  } catch (err) {
    console.log("SAVE ERROR:", err);
    res.status(500).json({ error: "save failed" });
  }
});

// =======================
// VIBER WEBHOOK
// =======================
app.post("/webhook", (req, res) => {
  const body = req.body;

  if (body.event === "message") {
    const msg = body.message.text || "";

    const item = findItem(msg);
    const reply = calculate(item, msg);

    console.log("User:", msg);
    console.log("Bot:", reply);
  }

  res.sendStatus(200);
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on " + PORT);
});