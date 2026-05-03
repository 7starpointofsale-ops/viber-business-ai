const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ================= CONFIG =================
const TOKEN = process.env.VIBER_TOKEN;

// 🔥 DEBUG (Render မှာစစ်ရန်)
console.log("🚀 BOT STARTED");
console.log("TOKEN OK:", !!TOKEN);

// ================= SESSION =================
const session = {};

const S = (id) => session[id] || {};
const U = (id, d) => (session[id] = { ...(session[id] || {}), ...d });
const R = (id) => delete session[id];

// ================= BOT =================
async function bot(userId, text) {
  const msg = text.trim().toLowerCase();
  const s = S(userId);

  // GREET
  if (msg === "hi" || msg === "hello") {
    return "🤖 Hello 👋 ကျွန်တော်က ကိုညီရဲ့တပည့်ပါ၊ ဆရာကြီးလို့ခေါ်ပါတယ်။ ဘာများကူညီပေးရမလဲခင်ဗျာ။";
  }

  // STEP 1
  if (!s.material) {
    U(userId, { material: msg });
    return "📏 Gram ဘယ်လောက်လဲ?";
  }

  // STEP 2
  if (!s.gram) {
    U(userId, { gram: msg });
    return "📄 1 side / 2 side ?";
  }

  // STEP 3
  if (!s.side) {
    U(userId, { side: msg });
    return "🧾 Lamination ပါလား? (yes / no)";
  }

  // STEP 4
  const lam = msg.includes("yes");

  R(userId);

  return `📦 ${s.material}
📏 ${s.gram}
📄 ${s.side}
🧾 Lamination: ${lam ? "Yes" : "No"}
💰 Total: Demo Price`;
}

// ================= SEND =================
async function send(userId, text) {
  if (!TOKEN) {
    console.log("❌ TOKEN MISSING");
    return;
  }

  try {
    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver: userId,
        type: "text",
        sender: { name: "7Star Bot" },
        text,
      },
      {
        headers: {
          "X-Viber-Auth-Token": TOKEN,
        },
      }
    );
  } catch (e) {
    console.log("SEND ERROR:", e.response?.data || e.message);
  }
}

// ================= WEBHOOK =================
app.post("/webhook", async (req, res) => {
  try {
    if (req.body.event !== "message") return res.sendStatus(200);

    const userId = req.body.sender.id;
    const text = req.body.message.text;

    const reply = await bot(userId, text);
    await send(userId, reply);

    res.sendStatus(200);
  } catch (e) {
    console.log("WEBHOOK ERROR:", e.message);
    res.sendStatus(200);
  }
});

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 RUNNING ON PORT", PORT);
});