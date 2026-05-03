const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ================= CONFIG =================
const TOKEN = process.env.VIBER_TOKEN;

// ================= STATE (simple memory) =================
let userState = {};

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
    res.send("BOT RUNNING");
});

// ================= WEBHOOK =================
app.post("/webhook", async (req, res) => {
    const event = req.body;

    if (!event || !event.message || !event.sender) {
        return res.sendStatus(200);
    }

    const userId = event.sender.id;
    const text = event.message.text?.trim();

    // ❌ ignore junk input
    if (!text || text.length < 2 || text === ".") {
        return res.sendStatus(200);
    }

    // init state
    if (!userState[userId]) {
        userState[userId] = { step: 0 };
    }

    let reply = "";

    // ================= FLOW =================

    // STEP 0 - greeting
    if (text.toLowerCase() === "hi") {
        reply = "🤖 Hello 👋 ကျွန်တော်က ကိုညီရဲ့တပည့်ပါ၊ ဆရာကြီးလို့ခေါ်ပါတယ်။ ဘာများကူညီပေးရမလဲခင်ဗျာ။";
        userState[userId].step = 0;
    }

    // STEP 1 - price request
    else if (text.includes("ဈေး")) {
        reply = "📦 Material ရိုက်ပါ (Art Paper / Art Card / White Card)";
        userState[userId].step = 1;
    }

    // STEP 2 - material
    else if (userState[userId].step === 1) {
        userState[userId].material = text;
        userState[userId].step = 2;
        reply = "📏 Gram ဘယ်လောက်လဲ?";
    }

    // STEP 3 - gram
    else if (userState[userId].step === 2) {
        userState[userId].gram = text;
        userState[userId].step = 3;
        reply = "🔢 Quantity ဘယ်လောက်လဲ?";
    }

    // STEP 4 - qty + calculate
    else if (userState[userId].step === 3) {
        const qty = parseInt(text) || 0;

        // simple demo pricing
        let basePrice = 0;

        if (userState[userId].material.toLowerCase().includes("art paper")) basePrice = 100;
        if (userState[userId].material.toLowerCase().includes("art card")) basePrice = 150;
        if (userState[userId].material.toLowerCase().includes("white")) basePrice = 80;

        const total = qty * basePrice;

        reply =
            `🧾 Order Summary\n` +
            `Material: ${userState[userId].material}\n` +
            `Gram: ${userState[userId].gram}\n` +
            `Qty: ${qty}\n` +
            `-----------------\n` +
            `💰 Total: ${total} MMK`;

        userState[userId].step = 0;
    }

    // default fallback
    else {
        reply = "📌 ဈေးတွက်ချင်ရင် 'ဈေး' လို့ရေးပါ";
    }

    await sendMessage(userId, reply);
    res.sendStatus(200);
});

// ================= SEND MESSAGE =================
async function sendMessage(userId, text) {
    try {
        await axios.post("https://chatapi.viber.com/pa/send_message", {
            receiver: userId,
            type: "text",
            text: text
        }, {
            headers: {
                "X-Viber-Auth-Token": TOKEN
            }
        });
    } catch (err) {
        console.log("SEND ERROR:", err.message);
    }
}

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("🚀 BOT STARTED");
    console.log("🚀 RUNNING ON PORT", PORT);
    console.log("TOKEN OK:", !!TOKEN);
});