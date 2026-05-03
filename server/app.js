const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const viberRoute = require("./routes/viber.route");

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/viber", viberRoute);

app.get("/", (req, res) => {
  res.send("Viber AI Bot is running 🚀");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});