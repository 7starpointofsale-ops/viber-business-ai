const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const { sendMessage } = require("./services/viber.service");

const app = express();
app.use(bodyParser.json());

// test route
app.get("/", (req, res) => {
  res.send("🚀 Viber Business AI Running");
});

// webhook
app.post("/webhook", async (req, res) => {
  const data = req.body;

  console.log("📩 Incoming:", data);

  const text = data?.message?.text;
  const userId = data?.sender?.id;

  if (!text || !userId) {
    return res.sendStatus(200);
  }

  let reply = "မင်္ဂလာပါ 👋";

  if (text === "hi") reply = "Hello 👋 Viber AI Bot မှကြိုဆိုပါတယ်";
  else if (text.includes("hello")) reply = "မင်္ဂလာပါ 😊 ဘာကူညီရမလဲ";
  else if (text.includes("price")) reply = "Price list ကို admin system မှာစစ်နေပါတယ်";
  else if (text.includes("order")) reply = "Order လုပ်လိုပါက details ပို့ပေးပါ";

  await sendMessage(userId, reply);

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});