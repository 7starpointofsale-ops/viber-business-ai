const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const { parseMessage } = require("./services/price.engine");

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// ADMIN (SAFE - KEEP)
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =======================
// API (SAFE - KEEP)
app.get("/api/prices", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  res.json(db);
});

// =======================
// VIBER SEND
async function send(userId, text) {
  try {
    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver: userId,
        type: "text",
        text
      },
      {
        headers: {
          "X-Viber-Auth-Token": process.env.VIBER_TOKEN
        }
      }
    );
  } catch (e) {
    console.log("Viber error:", e.message);
  }
}

// =======================
// 🧠 CHAT ENGINE (SMART + SAFE)
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.event !== "message") return res.sendStatus(200);

  const userId = body.sender.id;
  const msg = (body.message.text || "").trim();

  const r = parseMessage(msg);

  // =======================
  // GREETING (SAFE)
  if (["hi", "hello", "မင်္ဂလာပါ"].includes(msg.toLowerCase())) {
    await send(userId,
`👋 7Star Smart POS

👉 type: vinyl / card / paper`
    );
    return res.sendStatus(200);
  }

  // =======================
  // SAFE CALC (KEEP OLD FEATURE)
  if (/^[0-9+\-*/().\s]+$/.test(msg)) {
    try {
      const result = eval(msg);
      await send(userId, `🧮 ${result}`);
      return res.sendStatus(200);
    } catch {}
  }

  // =======================
  // NO ITEM FOUND
  if (!r.item) {
    await send(userId,
`❌ Service မတွေ့ပါ

👉 example: vinyl / card / paper`
    );
    return res.sendStatus(200);
  }

  // =======================
  // ONLY ITEM → ASK NEXT STEP
  if (r.item && !r.size) {
    await send(userId,
`📦 ${r.item.item}

📏 Size? (eg: 3x6)
💰 1 side: ${r.item.s1}
💰 2 side: ${r.item.s2}

👉 full: vinyl 3x6 2`
    );
    return res.sendStatus(200);
  }

  // =======================
  // CALC RESULT
  const base = r.item.s1 || 0;
  const qty = r.qty || 1;
  const total = base * qty;

  await send(userId,
`🧾 RESULT

Item: ${r.item.item}
Size: ${r.size.w}x${r.size.h}
Qty: ${qty}

💰 Total: ${total} Ks`
  );

  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 SAFE FULL SYSTEM V9 RUNNING");
});