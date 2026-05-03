const express = require("express");
require("dotenv").config();
const path = require("path");
const fs = require("fs");

const viberRoute = require("./routes/viber.route");

const app = express();
app.use(express.json());

/* ===============================
   📁 PATH
=================================*/
const DB_PATH = path.join(__dirname, "../database/price.db.json");

/* ===============================
   🤖 VIBER WEBHOOK
=================================*/
app.use("/webhook", viberRoute);

/* ===============================
   🌐 ADMIN PANEL (STATIC)
=================================*/
app.use("/admin", express.static(path.join(__dirname, "../admin")));

/* ===============================
   📊 GET ALL PRICES
=================================*/
app.get("/api/prices", (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_PATH));
  res.json(data);
});

/* ===============================
   ➕ ADD / UPDATE ITEM
=================================*/
app.post("/api/add-item", (req, res) => {
  const { category, item, size, side1, side2 } = req.body;

  let db = JSON.parse(fs.readFileSync(DB_PATH));

  let cat = db.categories.find(c => c.name === category);

  if (!cat) {
    cat = { name: category, items: [] };
    db.categories.push(cat);
  }

  let existing = cat.items.find(i => i.name === item);

  if (!existing) {
    existing = { name: item, sizes: {} };
    cat.items.push(existing);
  }

  existing.sizes[size] = {
    "1": Number(side1),
    "2": Number(side2)
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

  res.json({ success: true });
});

/* ===============================
   ❌ DELETE ITEM
=================================*/
app.post("/api/delete-item", (req, res) => {
  const { category, item, size } = req.body;

  let db = JSON.parse(fs.readFileSync(DB_PATH));

  let cat = db.categories.find(c => c.name === category);
  if (!cat) return res.json({ success: false });

  let it = cat.items.find(i => i.name === item);
  if (!it) return res.json({ success: false });

  delete it.sizes[size];

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

  res.json({ success: true });
});

/* ===============================
   🧹 CLEAN EMPTY ITEMS (OPTIONAL)
=================================*/
app.post("/api/cleanup", (req, res) => {
  let db = JSON.parse(fs.readFileSync(DB_PATH));

  db.categories.forEach(cat => {
    cat.items = cat.items.filter(i => Object.keys(i.sizes).length > 0);
  });

  db.categories = db.categories.filter(c => c.items.length > 0);

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

  res.json({ success: true });
});

/* ===============================
   🏠 ROOT
=================================*/
app.get("/", (req, res) => {
  res.send("Viber Bot Running 🚀");
});

/* ===============================
   🚀 START SERVER
=================================*/
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});