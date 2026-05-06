const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =======================
app.get("/api/prices", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  res.json(db);
});

// =======================
// SAVE (FLEXIBLE ITEM)
// =======================
app.post("/api/save-v2", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

  const data = req.body;
  const { category, item } = data;

  if (!category || !item) return res.json({ ok: false });

  let cat = db.categories.find(c => c.name === category);

  if (!cat) {
    cat = {
      name: category,
      items: []
    };
    db.categories.push(cat);
  }

  cat.items.push({
    id: Date.now().toString(),
    ...data
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

  res.json({ ok: true });
});

// =======================
// UPDATE PRICE
// =======================
app.post("/api/update-entry", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  const { id, price } = req.body;

  db.categories.forEach(c => {
    c.items.forEach(i => {
      if (i.id === id) {
        i.price = Number(price);
      }
    });
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

  res.json({ ok: true });
});

// =======================
// DELETE ITEM
// =======================
app.post("/api/delete-entry", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  const { id } = req.body;

  db.categories.forEach(c => {
    c.items = c.items.filter(i => i.id !== id);
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

  res.json({ ok: true });
});

// =======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 v8 FULL SYSTEM RUNNING");
});