const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const { parseMessage } = require("./services/price.engine");

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// ADMIN STATIC (KEEP)
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =======================
// GET DB (KEEP)
app.get("/api/prices", (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  res.json(db);
});

// =======================
// SAVE (KEEP ORIGINAL - SAFE)
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
// UPDATE PRICE (KEEP)
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
// DELETE ENTRY (KEEP)
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
// SAFE MATH
function isMath(msg) {
  return /^[0-9+\-*/().\s]+$/.test(msg);
}

function calc(msg) {
  try {
    if (isMath(msg)) return eval(msg);
  } catch {}
  return null;
}

// =======================
// NORMALIZE INPUT (NEW FIX)
function normalize(msg) {
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
// SMART FALLBACK SEARCH (FIX SERVICE BUG)
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
// WEBHOOK
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.event !== "message") return res.sendStatus(200);

  const userId = body.sender.id;
  let msg = normalize(body.message.text || "");

  const db = JSON.parse(fs.readFileSync(DB_PATH));

  // =======================
  // GREETING
  if (["hi", "hello", "မင်္ဂလာပါ"].includes(msg)) {
    await send(userId, "👋 7Star System Ready\nType service name (vinyl, paper, card)");
    return res.sendStatus(200);
  }

  // =======================
  // CALCULATOR (SAFE)
  const c = calc(msg);
  if (c !== null) {
    await send(userId, `🧮 ${c}`);
    return res.sendStatus(200);
  }

  // =======================
  // SMART SERVICE FIND
  const item = findService(db, msg);

  // ❌ NOT FOUND
  if (!item) {
    await send(userId, "❌ Service မတွေ့ပါ\n👉 example: vinyl / art paper / card");
    return res.sendStatus(200);
  }

  // =======================
  // SHOW PRICE INFO
  const sizeMatch = msg.match(/(\d+)\s*[x*]\s*(\d+)/);
  const qtyMatch = msg.match(/(\d+)/);

  const qty = qtyMatch ? Number(qtyMatch[1]) : 1;

  // STEP 1
  if (!sizeMatch) {
    await send(
      userId,
`📦 ${item.item}

💰 1 side: ${item.s1}
💰 2 side: ${item.s2}

📏 Size? (eg: 3x6)`
    );
    return res.sendStatus(200);
  }

  // STEP 2 CALC
  const total = item.s1 * qty;

  await send(
    userId,
`🧾 RESULT
Item: ${item.item}
Size: ${sizeMatch[1]}x${sizeMatch[2]}
Qty: ${qty}

💰 Total: ${total} Ks`
  );

  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 SAFE V9 RUNNING (NO BREAK CHANGES)");
});