const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// ADMIN STATIC
// =======================
app.use("/admin", express.static(path.join(__dirname, "../admin")));

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

  if (!category || !item) {
    return res.json({ ok: false });
  }

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
    size: size || "-",
    gsm: paper || "-",
    side: side || "-",
    price: Number(price || 0)
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");

  res.json({ ok: true });
});

// =======================
// UPDATE PRICE
// =======================
app.post("/api/update-entry", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

  const { entryId, price } = req.body;

  db.categories.forEach(cat => {
    cat.items.forEach(item => {
      item.entries?.forEach(e => {
        if (e.id == entryId) {
          e.price = Number(price);
        }
      });
    });
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

  res.json({ ok: true });
});

// =======================
// DELETE ENTRY
// =======================
app.post("/api/delete-entry", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

  const { entryId } = req.body;

  db.categories.forEach(cat => {
    cat.items.forEach(item => {
      if (item.entries) {
        item.entries = item.entries.filter(e => e.id != entryId);
      }
    });
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

  res.json({ ok: true });
});

// =======================
// DELETE CATEGORY
// =======================
app.post("/api/delete-category", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

  const { category } = req.body;

  db.categories = db.categories.filter(c => c.name != category);

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

  res.json({ ok: true });
});

// =======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 CLEAN SYSTEM RUNNING");
});