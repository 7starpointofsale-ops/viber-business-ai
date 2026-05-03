const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { sendMessage } = require("./services/viber.service");
const { findPrice } = require("./services/price.engine");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const dbPath = path.join(__dirname, "../database/price.db.json");

// ======================
// VIBER WEBHOOK
// ======================
app.post("/webhook", async (req, res) => {
  const data = req.body;

  const text = data?.message?.text?.toLowerCase();
  const userId = data?.sender?.id;

  if (!text || !userId) return res.sendStatus(200);

  let reply = findPrice(text);

  if (!reply) {
    if (text.includes("hi")) reply = "Hello 👋 Printing AI Bot";
    else if (text.includes("order")) reply = "Order details ပို့ပါ";
    else reply = "help လို့ရိုက်ပါ";
  }

  await sendMessage(userId, reply);

  res.sendStatus(200);
});

// ======================
// ADMIN PANEL (HTML UI)
// ======================
app.get("/admin", (req, res) => {
  res.send(`
    <h2>💎 Admin Panel</h2>

    <form method="POST" action="/update">
      <input name="key" placeholder="art_card_250" /><br><br>
      <input name="side" placeholder="1side or 2side" /><br><br>
      <input name="price" placeholder="New Price" /><br><br>
      <button type="submit">Update Price</button>
    </form>
  `);
});

// ======================
// UPDATE PRICE API
// ======================
app.post("/update", (req, res) => {
  const { key, side, price } = req.body;

  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

  if (db[key]) {
    db[key][side] = Number(price);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  }

  res.send("✅ Price Updated Successfully");
});

// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});