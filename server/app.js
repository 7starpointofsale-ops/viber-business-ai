const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const { parseMessage } = require("./services/price.engine");

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// ADMIN STATIC
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =======================
// GET DB
app.get("/api/prices", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  res.json(db);
});

// =======================
// SAVE
app.post("/api/save-v2", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

  const data = req.body;
  const { category, item } = data;

  if (!category || !item) return res.json({ ok: false });

  let cat = db.categories.find(c => c.name === category);

  if (!cat) {
    cat = { name: category, items: [] };
    db.categories.push(cat);
  }

  cat.items.push({
    id: Date.now().toString(),
    ...data
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  res.json({ ok: true });
});

// =======================
// UPDATE
app.post("/api/update-entry", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  const { id, price } = req.body;

  db.categories.forEach(c => {
    c.items.forEach(i => {
      if (i.id === id) {
        i.price = Number(price);
      }
    });
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  res.json({ ok: true });
});

// =======================
// DELETE
app.post("/api/delete-entry", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  const { id } = req.body;

  db.categories.forEach(c => {
    c.items = c.items.filter(i => i.id !== id);
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  res.json({ ok: true });
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
// NORMALIZE (MM + fix typo)
function normalize(msg = "") {
  return msg
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
    .replace(/၀/g, "0")
    .replace(/\*/g, "x")
    .trim();
}

// =======================
// FIND SERVICE (FIXED STRONG MATCH)
function findService(db, msg) {
  let best = null;
  let score = 0;

  db.categories.forEach(c => {
    c.items.forEach(i => {

      const name = (i.item || "").toLowerCase();

      let s = 0;

      if (msg.includes(name)) s += 3;
      if (msg.includes(c.name.toLowerCase())) s += 2;

      if (s > score) {
        score = s;
        best = i;
      }
    });
  });

  return best;
}

// =======================
// SAFE CALC
function calc(msg) {
  try {
    if (/^[0-9+\-*/().\s]+$/.test(msg)) {
      return eval(msg);
    }
  } catch {}
  return null;
}

// =======================
// WEBHOOK (FIXED LOGIC)
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.event !== "message") return res.sendStatus(200);

  const userId = body.sender.id;
  let msg = normalize(body.message.text || "");

  const db = JSON.parse(fs.readFileSync(DB_PATH));

  // =======================
  // GREETING
  if (["hi", "hello", "မင်္ဂလာပါ"].includes(msg)) {
    await send(userId, "👋 7Star System Ready\nType service name");
    return res.sendStatus(200);
  }

  // =======================
  // CALC
  const c = calc(msg);
  if (c !== null) {
    await send(userId, `🧮 ${c}`);
    return res.sendStatus(200);
  }

  // =======================
  const item = findService(db, msg);

  if (!item) {
    await send(userId, "❌ Service မတွေ့ပါ");
    return res.sendStatus(200);
  }

  // =======================
  const sizeMatch = msg.match(/(\d+)\s*[x*]\s*(\d+)/);
  const qtyMatch = msg.match(/(\d+)/);
  const qty = qtyMatch ? Number(qtyMatch[1]) : 1;

  const hasPrice = item.s1 && item.s2;

  // =======================
  // CASE 1: FULL INPUT → DIRECT RESULT (NO SIZE QUESTION)
  if (sizeMatch && hasPrice) {

    const total = item.s1 * qty;

    await send(userId,
`🧾 RESULT
Item: ${item.item}
Qty: ${qty}

💰 Total: ${total} Ks`
    );

    return res.sendStatus(200);
  }

  // =======================
  // CASE 2: SERVICE ONLY → SHOW OPTIONS (NO LOOP BUG)
  if (!sizeMatch && hasPrice) {

    await send(userId,
`📦 ${item.item}

💰 1 side: ${item.s1}
💰 2 side: ${item.s2}

👉 send: size qty (eg: 3x6 2)`
    );

    return res.sendStatus(200);
  }

  // =======================
  await send(userId, "📏 Please provide size + qty");
  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 V10 STABLE SYSTEM RUNNING");
});