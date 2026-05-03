const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.json());

// ===================== PATHS =====================
const DB_PATH = path.join(__dirname, "../database/price.db.json");

// ===================== ADMIN PANEL =====================
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// ===================== LOAD DB =====================
function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

// ===================== API GET =====================
app.get("/api/prices", (req, res) => {
  res.json(loadDB());
});

// ===================== ADD ITEM =====================
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

  // TABLE MODE
  if (type === "table") {
    it.prices[size] = {
      "1": Number(side1 || 0),
      "2": Number(side2 || 0)
    };
  }

  // FIXED MODE
  if (type === "fixed") {
    it.prices[fixedValue] = Number(fixedPrice || 0);
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  res.json({ ok: true });
});

// ===================== DELETE =====================
app.post("/api/delete-item", (req, res) => {
  const db = loadDB();
  const { category, item } = req.body;

  const cat = db.categories.find(c => c.name === category);
  if (cat) {
    cat.items = cat.items.filter(i => i.name !== item);
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  res.json({ ok: true });
});

// ===================== VIBER TEST =====================
app.get("/", (req, res) => {
  res.send("🚀 Viber Business AI Running");
});

// ===================== START =====================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Server running on " + PORT);
});