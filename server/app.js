const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =======================
// 🤖 BOT CONTROLLER
// =======================
const botController = require("./controllers/bot.controller");

// =======================
// 🔥 VIBER WEBHOOK ROUTE (IMPORTANT)
// =======================
app.post("/webhook", botController.handleMessage);

// =======================
// 📁 ADMIN PANEL
// =======================
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =======================
// 🧪 TEST ROUTE
// =======================
app.get("/", (req, res) => {
  res.send("🚀 Viber Bot Running...");
});

// =======================
// 🚀 START SERVER
// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});