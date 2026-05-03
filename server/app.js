const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(bodyParser.json());
app.use(express.static("admin"));

// =======================
// DB PATH FIX (IMPORTANT)
// =======================
const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// LOAD DB
// =======================
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    console.log("❌ DB NOT FOUND:", DB_PATH);
    return { categories: [] };
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

// =======================
// SAVE DB
// =======================
function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// =======================
// API - GET PRICES
// =======================
app.get("/api/prices", (req, res) => {
  res.json(loadDB());
});

// =======================
// API - ADD ITEM
// =======================
app.post("/api/add-item", (req, res) => {
  const { category, item, size, side1, side2 } = req.body;

  let db = loadDB();

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

  saveDB(db);

  res.json({ success: true });
});

// =======================
// API - DELETE ITEM
// =======================
app.post("/api/delete-item", (req, res) => {
  const { category, item, size } = req.body;

  let db = loadDB();

  let cat = db.categories.find(c => c.name === category);
  if (!cat) return res.json({ ok: false });

  let it = cat.items.find(i => i.name === item);
  if (!it) return res.json({ ok: false });

  delete it.sizes[size];

  saveDB(db);

  res.json({ success: true });
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});