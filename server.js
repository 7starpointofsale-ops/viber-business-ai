const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ================= CONFIG =================
const TOKEN = process.env.VIBER_TOKEN;

// ================= START =================
app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});

// ================= WEBHOOK =================
app.post("/webhook", async (req, res) => {
  try {
    if (req.body.event !== "message") return res.sendStatus(200);

    const userId = req.body.sender.id;
    const text = req.body.message.text;

    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver: userId,
        type: "text",
        sender: { name: "7 Star Bot 🤖" },
        text: "Echo: " + text,
      },
      {
        headers: {
          "X-Viber-Auth-Token": TOKEN,
        },
      }
    );

    res.sendStatus(200);
  } catch (e) {
    console.log("ERROR:", e.message);
    res.sendStatus(200);
  }
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 BOT RUNNING ON PORT", PORT);
});