const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ===== ENV =====
const TOKEN = process.env.VIBER_TOKEN;

// ===== STATE =====
const userState = {};

// ===== PRICE TABLE =====
const priceTable = {
  "art paper 128g": { "1": 1400, "2": 2100, lamination: 1000 },
  "art paper 148g": { "1": 1600, "2": 2300, lamination: 1000 },

  "art card 210g": { "1": 1900, "2": 2500, lamination: 1000 },
  "art card 250g": { "1": 2200, "2": 2800, lamination: 1000 },
  "art card 300g": { "1": 2700, "2": 3800, lamination: 1000 },
  "art card 350g": { "1": 2400, "2": 3000, lamination: 1000 },

  "white card 250g": { "1": 2900, "2": 4000, lamination: 1000 },
  "mian card 300g": { "1": 3200, "2": 4300, lamination: 1000 },
  "egg card 300g": { "1": 3200, "2": 4300, lamination: 1000 },
  "cameo card 250g": { "1": 3200, "2": 4300, lamination: 1000 },
  "kraft card 250g": { "1": 3200, "2": 4300, lamination: 1000 },
  "crystal card 285g": { "1": 3200, "2": 4300, lamination: 1000 },
  "singapore card 280g": { "1": 3200, "2": 4300, lamination: 1000 },
  "tree emboss 250g": { "1": 3200, "2": 4300, lamination: 1000 },
  "sand card 250g": { "1": 3200, "2": 4300, lamination: 1000 },
  "england card 300g": { "1": 3200, "2": 4300, lamination: 1000 },
  "japan spot 250g": { "1": 3200, "2": 4300, lamination: 1000 }
};

// ===== SEND MESSAGE =====
function sendMessage(receiver, text) {
  return axios.post(
    "https://chatapi.viber.com/pa/send_message",
    {
      receiver,
      type: "text",
      text,
    },
    {
      headers: {
        "X-Viber-Auth-Token": TOKEN,
        "Content-Type": "application/json",
      },
    }
  );
}

// ===== WEBHOOK =====
app.post("/webhook", async (req, res) => {
  const event = req.body;

  if (!event || !event.sender) return res.sendStatus(200);

  const userId = String(event.sender.id);
  const text = (event.message?.text || "").trim().toLowerCase();

  if (!userState[userId]) userState[userId] = { step: 0 };

  // hi
  if (text === "hi") {
    userState[userId].step = 1;
    await sendMessage(userId,
      "🤖 Hello 👋 ကျွန်တော်က ကိုညီရဲ့တပည့်ပါ၊ ဆရာကြီးလို့ခေါ်ပါတယ်။"
    );
    return res.sendStatus(200);
  }

  // price start
  if (text.includes("ဈေး")) {
    userState[userId].step = 2;
    await sendMessage(userId, "📦 Material ရိုက်ပါ (example: Art Paper 128g)");
    return res.sendStatus(200);
  }

  // STEP 2 material
  if (userState[userId].step === 2) {
    userState[userId].material = text;
    userState[userId].step = 3;
    await sendMessage(userId, "🔢 Quantity ဘယ်လောက်လဲ?");
    return res.sendStatus(200);
  }

  // STEP 3 qty
  if (userState[userId].step === 3) {
    userState[userId].qty = text;

    const material = userState[userId].material;
    const qty = parseInt(text);

    const unitPrice = priceTable[material]?.["1"] || 1000;

    const total = unitPrice * qty;

    await sendMessage(
      userId,
      `🧾 Order Summary\nMaterial: ${material}\nQty: ${qty}\nUnit: ${unitPrice}\n💰 Total: ${total} MMK`
    );

    userState[userId] = { step: 0 };
    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// ===== ROOT =====
app.get("/", (req, res) => {
  res.send("BOT RUNNING");
});

// ===== START =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 BOT STARTED");
  console.log("🚀 RUNNING ON PORT", PORT);
  console.log("TOKEN OK:", !!TOKEN);
});