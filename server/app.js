const express = require("express");
const axios = require("axios");
const path = require("path");

const { findItem, calculate } = require("./services/price.engine");

const app = express();
app.use(express.json());

// ADMIN
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// ================= BOT =================
function handleMessage(text = "") {
  const msg = text.toLowerCase();

  if (["hi", "hello", "မင်္ဂလာပါ"].includes(msg)) {
    return "Hello 👋 7Star Printing AI မှကြိုဆိုပါတယ်";
  }

  const item = findItem(msg);
  if (!item) return "❌ Item မတွေ့ပါ";

  return calculate(item, msg);
}

// ================= WEBHOOK =================
app.post("/webhook", async (req, res) => {
  try {
    const event = req.body;

    if (event.event === "message") {
      const text = event.message.text;
      const sender = event.sender.id;

      const reply = handleMessage(text);

      await axios.post(
        "https://chatapi.viber.com/pa/send_message",
        {
          receiver: sender,
          type: "text",
          text: reply,
          sender: { name: "7 Star Sayar Gyi" }
        },
        {
          headers: {
            "X-Viber-Auth-Token": process.env.VIBER_TOKEN
          }
        }
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(200);
  }
});

// ROOT
app.get("/", (req, res) => {
  res.send("🚀 Running");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Server running on " + PORT));