const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// =====================
// PATH FIX (IMPORTANT)
// =====================
const DB_PATH = path.join(__dirname, "database", "price.db.json");

// =====================
// LOAD DB
// =====================
function loadDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("❌ DB LOAD ERROR:", err.message);
    return { categories: [] };
  }
}

// =====================
// SAVE DB
// =====================
function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// =====================
// ADMIN PANEL SERVE
// =====================
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =====================
// API - GET PRICES
// =====================
app.get("/api/prices", (req, res) => {
  res.json(loadDB());
});

// =====================
// API - ADD ITEM
// =====================
app.post("/api/add-item", (req, res) => {
  const { category, item, size, side1, side2 } = req.body;

  const db = loadDB();

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

  res.json({ ok: true });
});

// =====================
// API - DELETE ITEM
// =====================
app.post("/api/delete-item", (req, res) => {
  const { category, item, size } = req.body;

  const db = loadDB();

  const cat = db.categories.find(c => c.name === category);
  if (!cat) return res.json({ ok: false });

  const it = cat.items.find(i => i.name === item);
  if (!it) return res.json({ ok: false });

  delete it.sizes[size];

  saveDB(db);

  res.json({ ok: true });
});

// =====================
// ROOT CHECK
// =====================
app.get("/", (req, res) => {
  res.send("🚀 Server Running");
});

// =====================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});