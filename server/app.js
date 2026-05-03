const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

// test route
app.get("/", (req, res) => {
  res.send("🚀 Viber Business AI is running");
});

// webhook route
app.post("/webhook", (req, res) => {
  console.log("📩 Message received:", req.body);

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});