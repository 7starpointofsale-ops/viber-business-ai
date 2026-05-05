const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// =======================
const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// ADMIN STATIC
// =======================
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =======================
// HOME
// =======================
app.get("/", (req, res) => {
  res.send("✅ 7Star AI Running");
});

// =======================
// GET DB
// =======================
app.get("/api/prices", (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    res.json(db);
  } catch (e) {
    res.status(500).json({ error: "db error" });
  }
});

// =======================
// SAVE (NEW STRUCTURE)
// =======================
app.post("/api/save-v2", (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH));

    const { category, item, size, side, price } = req.body;

    let cat = db.categories.find(c => c.name === category);
    if (!cat) {
      cat = { name: category, items: [] };
      db.categories.push(cat);
    }

    let it = cat.items.find(i => i.name === item);
    if (!it) {
      it = { name: item, entries: [] };
      cat.items.push(it);
    }

    it.entries.push({
      size,
      side,
      price: Number(price)
    });

    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    res.json({ ok: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "save error" });
  }
});

// =======================
// DELETE
// =======================
app.post("/api/delete-item", (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH));

    const { category, item } = req.body;

    const cat = db.categories.find(c => c.name === category);
    if (!cat) return res.json({ ok: false });

    cat.items = cat.items.filter(i => i.name !== item);

    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    res.json({ ok: true });

  } catch (err) {
    res.status(500).json({ error: "delete error" });
  }
});

// =======================
// VIBER BOT
// =======================
app.post("/webhook", (req, res) => {
  const body = req.body;

  if (body.event === "message") {
    const msg = (body.message.text || "").toLowerCase();

    let reply = "";

    const db = JSON.parse(fs.readFileSync(DB_PATH));

    // GREETING
    if (["hi", "hello", "မင်္ဂလာပါ"].includes(msg)) {
      reply = "Hello 👋 7Star Printing AI မှကြိုဆိုပါတယ်";
    }

    // CATEGORY LIST
    else if (db.categories.find(c => msg.includes(c.name.toLowerCase()))) {

      const cat = db.categories.find(c =>
        msg.includes(c.name.toLowerCase())
      );

      reply = `📁 ${cat.name}\n\n`;

      cat.items.forEach(i => {
        reply += `📄 ${i.name}\n`;

        if (i.entries) {
          i.entries.forEach(e => {
            reply += `${e.size} ${e.side ? e.side+" side" : ""} → ${e.price} Ks\n`;
          });
        }

        reply += "\n";
      });
    }

    // ITEM SEARCH
    else {
      reply = "❌ Item မတွေ့ပါ";
    }

    console.log("User:", msg);
    console.log("Bot:", reply);
  }

  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on " + PORT);
});