const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ================= TOKEN =================
const TOKEN = process.env.VIBER_TOKEN;

// ================= USER STATE =================
const userState = {};

// ================= PRICE TABLE =================
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
  "japan spot 250g": { "1": 3200, "2": 4300, lamination: 1000 },

  "vle-aq 250g": { "1": 3200, "2": 4300, lamination: 1000 },
  "vle-ca 250g": { "1": 3200, "2": 4300, lamination: 1000 },
  "vle-ch 250g": { "1": 3200, "2": 4300, lamination: 1000 },
  "vle-hx 250g": { "1": 3200, "2": 4300, lamination: 1000 }
};

// ================= NORMALIZE =================
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/၁/g, "1")
    .replace(/၂/g, "2")
    .replace(/၃/g, "3")
    .replace(/၄/g, "4")
    .replace(/၅/g, "5")
    .replace(/၆/g, "6")
    .replace(/၇/g, "7")
    .replace(/၈/g, "8")
    .replace(/၉/g, "9")
    .trim();
}

// ================= MATERIAL MATCH =================
function findMaterial(input) {
  const text = normalize(input);

  const keys = Object.keys(priceTable);

  return (
    keys.find(k => text.includes(k)) ||
    keys.find(k => k.includes(text)) ||
    text
  );
}

// ================= SEND MESSAGE =================
function sendMessage(receiver, text) {
  return axios.post(
    "https://chatapi.viber.com/pa/send_message",
    {
      receiver,
      type: "text",
      text
    },
    {
      headers: {
        "X-Viber-Auth-Token": TOKEN,
        "Content-Type": "application/json"
      }
    }
  );
}

// ================= WEBHOOK =================
app.post("/webhook", async (req, res) => {
  const event = req.body;
  if (!event || !event.sender) return res.sendStatus(200);

  const userId = String(event.sender.id);
  const text = normalize(event.message?.text || "");

  if (!userState[userId]) {
    userState[userId] = { step: 0 };
  }

  // ================= RESET =================
  if (text === "hi") {
    userState[userId] = { step: 1 };

    await sendMessage(
      userId,
      "🤖 Hello 👋\nကျွန်တော်က ကိုညီရဲ့တပည့်ပါ၊ ဆရာကြီးလို့ခေါ်ပါတယ်။"
    );

    return res.sendStatus(200);
  }

  // ================= START PRICE =================
  if (text.includes("ဈေး")) {
    userState[userId].step = 2;

    await sendMessage(
      userId,
      "📦 Material ရိုက်ပါ (Art Paper / Art Card / White Card)"
    );

    return res.sendStatus(200);
  }

  // ================= STEP 2 MATERIAL =================
  if (userState[userId].step === 2) {
    userState[userId].material = findMaterial(text);
    userState[userId].step = 3;

    await sendMessage(userId, "🔢 Quantity ဘယ်လောက်လဲ?");
    return res.sendStatus(200);
  }

  // ================= STEP 3 QTY =================
  if (userState[userId].step === 3) {
    const qty = parseInt(text.replace(/[^\d]/g, "")) || 1;

    const material = userState[userId].material;
    const unitPrice = priceTable[material]?.["1"] || 1000;

    const total = unitPrice * qty;

    await sendMessage(
      userId,
      `🧾 Order Summary\n` +
      `Material: ${material}\n` +
      `Qty: ${qty}\n` +
      `Unit Price: ${unitPrice}\n` +
      `💰 Total: ${total} MMK`
    );

    userState[userId] = { step: 0 };
    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("🚀 VIBER POS BOT V3 RUNNING");
});

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 BOT STARTED");
  console.log("PORT:", PORT);
  console.log("TOKEN OK:", !!TOKEN);
});