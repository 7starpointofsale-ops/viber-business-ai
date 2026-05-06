const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// ADMIN FOLDER (FIX)
// =======================
app.use("/admin", express.static(path.resolve(__dirname, "../admin")));

// =======================
// HOME
// =======================
app.get("/", (req, res) => {
  res.send("🚀 7Star System Running");
});

// =======================
// GET DB
// =======================
app.get("/api/prices", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  res.json(db);
});

// =======================
// SAVE
// =======================
app.post("/api/save-v2", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

  const { category, item, size, paper, side, price } = req.body;

  let cat = db.categories.find(c => c.name === category);

  if (!cat) {
    cat = { name: category, items: [] };
    db.categories.push(cat);
  }

  let it = cat.items.find(i => i.name === item);

  if (!it) {
    it = { name: item, entries: [] };
    cat.items.push(it);
  }

  if (!it.entries) it.entries = [];

  it.entries.push({
    id: Date.now().toString(),
    size,
    gsm: paper,
    side,
    price: Number(price)
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");

  console.log("✅ SAVED");

  res.json({ ok: true });
});

// =======================
// DELETE CATEGORY
// =======================
app.post("/api/delete-category", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

  const { category } = req.body;

  db.categories = db.categories.filter(c => c.name !== category);

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");

  console.log("🗑 DELETED CATEGORY");

  res.json({ ok: true });
});

// =======================
// DELETE ITEMS
// =======================
app.post("/api/delete-items", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

  const { ids } = req.body;

  db.categories.forEach(cat => {
    cat.items.forEach(item => {
      if (item.entries) {
        item.entries = item.entries.filter(e => !ids.includes(e.id));
      }
    });

    cat.items = cat.items.filter(i => i.entries && i.entries.length > 0);
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");

  res.json({ ok: true });
});

// =======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 RUNNING ON " + PORT);
});