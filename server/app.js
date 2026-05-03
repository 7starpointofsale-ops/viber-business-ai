const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "../database/price.db.json");

// ================= LOAD =================
function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

// ================= GET =================
app.get("/api/prices", (req, res) => {
  res.json(loadDB());
});

// ================= ADD =================
app.post("/api/add-item", (req, res) => {
  const db = loadDB();

  const { category, item, type, size, side1, side2, qty, price } = req.body;

  let cat = db.categories.find(c => c.name === category);
  if (!cat) {
    cat = { name: category, items: [] };
    db.categories.push(cat);
  }

  let it = cat.items.find(i => i.name === item);
  if (!it) {
    it = { name: item, prices: {} };
    cat.items.push(it);
  }

  it.type = type;

  // NORMAL + MIXED (SIZE)
  if (size) {
    it.prices[size] = {
      "1": Number(side1 || 0),
      "2": Number(side2 || 0)
    };
  }

  // FIXED + MIXED (QTY)
  if (qty) {
    it.prices = it.prices || {};
    it.prices[qty] = Number(price);
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  res.json({ ok: true });
});

// ================= DELETE =================
app.post("/api/delete-item", (req, res) => {
  const db = loadDB();
  const { category, item } = req.body;

  const cat = db.categories.find(c => c.name === category);
  if (!cat) return res.json({ ok: false });

  cat.items = cat.items.filter(i => i.name !== item);

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  res.json({ ok: true });
});

// ================= START =================
app.listen(10000, () => {
  console.log("🚀 Server running on 10000");
});