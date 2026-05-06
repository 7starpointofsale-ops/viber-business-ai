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
// SAVE (KEEP ORIGINAL)
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
// 🔥 NEW: VIBER CHAT ENGINE (ADDED ONLY)
// =======================

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
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.event !== "message") return res.sendStatus(200);

  const userId = body.sender.id;
  const msg = (body.message.text || "").toLowerCase().trim();

  const db = JSON.parse(fs.readFileSync(DB_PATH));

  // =======================
  // GREETING
  if (["hi", "hello", "မင်္ဂလာပါ"].includes(msg)) {
    await send(userId, "👋 7Star System Ready\nType service name");
    return res.sendStatus(200);
  }

  // =======================
  // CALC (SAFE)
  if (/^[0-9+\-*/().\s]+$/.test(msg)) {
    try {
      const r = eval(msg);
      await send(userId, `🧮 ${r}`);
      return res.sendStatus(200);
    } catch {}
  }

  // =======================
  // PRICE ENGINE
  const result = parseMessage(msg);

  // ITEM FOUND
  if (result.item && !result.size) {
    await send(
      userId,
`📦 ${result.item.item}

📏 Size?
💰 1 side: ${result.item.s1}
💰 2 side: ${result.item.s2}`
    );
    return res.sendStatus(200);
  }

  // CALC
  if (result.item && result.size) {
    const total = result.item.s1 * result.qty;

    await send(
      userId,
`🧾 RESULT
Item: ${result.item.item}
Size: ${result.size.w}x${result.size.h}
Qty: ${result.qty}

💰 Total: ${total} Ks`
    );
    return res.sendStatus(200);
  }

  // =======================
  await send(userId, "❌ Service မတွေ့ပါ");
  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 SAFE V8 RUNNING");
});