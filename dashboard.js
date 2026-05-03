const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send(`
    <h1>POS Dashboard</h1>
    <p>Bot is running...</p>
  `);
});

app.listen(4000, () => {
  console.log("DASHBOARD RUNNING ON 4000");
});