const express = require("express");
require("dotenv").config();

const viberRoute = require("./routes/viber.route");

const app = express();
app.use(express.json());

app.use("/webhook", viberRoute);

app.get("/", (req, res) => {
  res.send("Viber Bot Running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});