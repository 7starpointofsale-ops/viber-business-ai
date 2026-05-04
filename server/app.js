const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(express.json());

// ================= PATH FIX =================
const DB_PATH = path.join(__dirname, "../database/price.db.json");

// ================= SAFE LOAD =================
function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch (err) {
    console.error("DB ERROR:", err.message);
    return { categories: [] };
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ================= ADMIN =================
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// ================= API =================
app.get("/api/prices", (req, res) => {
  res.json(loadDB());
});

app.post("/api/add-item", (req, res) => {
  const db = loadDB();
  const { category, item, size, side1, side2 } = req.body;

  let cat = db.categories.find(c => c.name === category);
  if (!cat) {
    cat = { name: category, items: [] };
    db.categories.push(cat);
  }

  let it = cat.items.find(i => i.name === item);
  if (!it) {
    it = { name: item, sizes: {} };
    cat.items.push(it);
  }

  it.sizes[size] = {
    "1": Number(side1 || 0),
    "2": Number(side2 || 0)
  };

  saveDB(db);
  res.json({ ok: true });
});

// ================= BOT =================
function handleMessage(text = "") {
  const msg = text.toLowerCase();
  const db = loadDB();

  if (msg === "hi" || msg === "hello" || msg === "မင်္ဂလာပါ") {
    return "Hello 👋 7Star Printing AI မှကြိုဆိုပါတယ်";
  }

  for (const cat of db.categories) {
    for (const item of cat.items) {
      if (msg.includes(item.name.toLowerCase())) {
        let reply = `📄 ${item.name}\n\n`;

        for (const size in item.sizes) {
          const s = item.sizes[size];
          reply += `${size}:\n1 Side: ${s["1"]} Ks\n2 Side: ${s["2"]} Ks\n\n`;
        }

        return reply;
      }
    }
  }

  return "❌ Item မတွေ့ပါ";
}

// ================= VIBER =================
app.post("/webhook", async (req, res) => {
  const event = req.body;

  if (event.event === "message") {
    const text = event.message.text;
    const sender = event.sender.id;

    const reply = handleMessage(text);

    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver: sender,
        type: "text",
        text: reply,
        sender: { name: "7 Star Sayar Gyi" }
      },
      {
        headers: {
          "X-Viber-Auth-Token": process.env.VIBER_TOKEN
        }
      }
    );
  }

  res.sendStatus(200);
});

// ================= START =================
app.get("/", (req, res) => {
  res.send("🚀 Viber AI Running");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Server running on " + PORT);
});