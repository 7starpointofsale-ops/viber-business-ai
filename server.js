const express = require("express");
const axios = require("axios");
const { priceTable, orders } = require("./data");

const app = express();
app.use(express.json());

const TOKEN = process.env.VIBER_TOKEN;
const userState = {};

// ================= normalize =================
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/၁/g,"1").replace(/၂/g,"2")
    .replace(/၃/g,"3").replace(/၄/g,"4")
    .trim();
}

// ================= smart match =================
function findMaterial(input) {
  const text = normalize(input);
  const keys = Object.keys(priceTable);

  return (
    keys.find(k => text === k) ||
    keys.find(k => text.includes(k)) ||
    keys.find(k => k.includes(text)) ||
    null
  );
}

// ================= send =================
function send(receiver, text) {
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

// ================= webhook =================
app.post("/webhook", async (req, res) => {
  const e = req.body;
  if (!e.sender) return res.sendStatus(200);

  const id = String(e.sender.id);
  const text = normalize(e.message?.text || "");

  if (!userState[id]) userState[id] = { step: 0 };

  // ===== RESET =====
  if (text === "hi") {
    userState[id] = { step: 1 };

    await send(id,
      "🤖 POS Bot Ready\nဈေးတွက်ရန် 'ဈေးတွက်ပေးပါ' ရိုက်ပါ"
    );

    return res.sendStatus(200);
  }

  // ===== START PRICE =====
  if (text.includes("ဈေး")) {
    userState[id].step = 2;

    await send(id, "📦 Material ရိုက်ပါ (Art Paper 128g)");
    return res.sendStatus(200);
  }

  // ===== MATERIAL =====
  if (userState[id].step === 2) {
    const mat = findMaterial(text);

    if (!mat) {
      await send(id, "❌ Material မတွေ့ပါ");
      return res.sendStatus(200);
    }

    userState[id].material = mat;
    userState[id].step = 3;

    await send(id, "🔢 Quantity?");
    return res.sendStatus(200);
  }

  // ===== QTY =====
  if (userState[id].step === 3) {
    const qty = parseInt(text.replace(/[^\d]/g,"")) || 1;

    const mat = userState[id].material;
    const unit = priceTable[mat]?.["1"] || 1000;
    const total = unit * qty;

    orders.push({ id, mat, qty, unit, total, time: new Date() });

    await send(id,
      `🧾 ORDER\nMaterial: ${mat}\nQty: ${qty}\nUnit: ${unit}\nTotal: ${total}`
    );

    userState[id] = { step: 0 };

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// ================= API =================
app.get("/api/orders", (req,res)=>{
  res.json(orders);
});

// ================= ROOT =================
app.get("/", (req,res)=>{
  res.send("VIBER POS RUNNING 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{
  console.log("BOT RUNNING", PORT);
  console.log("TOKEN:", !!TOKEN);
});