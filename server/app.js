const express = require("express");
const app = express();

const botController = require("./controllers/bot.controller");

// JSON parse
app.use(express.json());

// health check
app.get("/", (req, res) => {
  res.send("Server running");
});

// webhook (Viber)
app.post("/webhook", botController.handleMessage);

// ❌ REMOVE THIS (IMPORTANT)
// DO NOT require price.db.json here

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});