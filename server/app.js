const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();

// controllers
const botController = require("./controllers/bot.controller");

// middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 🔥 static admin panel
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// API routes
app.get("/", (req, res) => {
  res.send("Viber Bot Running 🚀");
});

// price DB API
app.get("/api/prices", (req, res) => {
  const db = require("../price.db.json");
  res.json(db);
});

// add item (simple)
app.post("/api/add-item", (req, res) => {
  res.json({ ok: true });
});

// delete item
app.post("/api/delete-item", (req, res) => {
  res.json({ ok: true });
});

// Viber webhook
app.post("/webhook", botController.handleMessage);

// 🔥 IMPORTANT PORT FIX (Render)
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});