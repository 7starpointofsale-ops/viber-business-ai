const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const viberRoute = require("./routes/viber.route");

const app = express();
app.use(bodyParser.json());

app.use("/webhook", viberRoute);

app.get("/", (req, res) => {
  res.send("🚀 Viber Business AI Running...");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});