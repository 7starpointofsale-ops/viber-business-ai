const express = require("express");
require("dotenv").config();
const path = require("path");

const viberRoute = require("./routes/viber.route");

const app = express();
app.use(express.json());

/* API ROUTE */
app.use("/webhook", viberRoute);

/* ADMIN STATIC UI */
app.use("/admin", express.static(path.join(__dirname, "../admin")));

/* API FOR PRICE UPDATE */
const fs = require("fs");
const DB_PATH = path.join(__dirname, "../database/price.db.json");

/* GET ALL PRICE */
app.get("/api/prices", (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_PATH));
  res.json(data);
});

/* ADD ITEM */
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

app.get("/", (req, res) => {
  res.send("Viber Bot Running 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});