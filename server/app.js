const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(express.json());

const ROOT = path.join(__dirname, "..");
const DB_PATH = path.join(ROOT, "database/price.db.json");
const ADMIN_PATH = path.join(ROOT, "admin");

/* =======================
   DB
======================= */
function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify({ categories: [] }, null, 2));
    }

    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8") || '{"categories":[]}');
  } catch (e) {
    console.log("DB ERROR:", e.message);
    return { categories: [] };
  }
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.log("SAVE ERROR:", e.message);
  }
}

/* =======================
   ADMIN
======================= */
app.use("/admin", express.static(ADMIN_PATH));

app.get(/^\/admin(\/.*)?$/, (req, res) => {
  const filePath = path.join(ADMIN_PATH, "index.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.send("Admin not found");
  }
});

/* =======================
   API
======================= */
app.get("/api/prices", (req, res) => {
  res.json(loadDB());
});

/* =======================
   STATE
======================= */
const userState = {};

/* =======================
   CLEAN
======================= */
function clean(msg) {
  return (msg || "")
    .replace(/[📁📄💰🧮📦🧾]/g, "")
    .trim()
    .toLowerCase();
}

/* =======================
   SEND
======================= */
async function send(userId, text, keyboard = null) {
  try {
    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver: userId,
        type: "text",
        text,
        keyboard
      },
      {
        headers: { "X-Viber-Auth-Token": process.env.VIBER_TOKEN }
      }
    );
  } catch (e) {
    console.log("VIBER ERROR:", e.message);
  }
}

/* =======================
   KB
======================= */
function kb(items) {
  return {
    Type: "keyboard",
    Buttons: items.map(i => ({
      ActionType: "reply",
      ActionBody: i.value,
      Text: i.label,
      Columns: 3,
      Rows: 1
    }))
  };
}

const MAIN_MENU = kb([
  { label: "💰 ဈေးမေးမယ်", value: "price" },
  { label: "🧮 ဈေးတွက်မယ်", value: "calc" },
  { label: "🧾 Invoice", value: "invoice" }
]);

/* =======================
   WEBHOOK
======================= */
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    if (body.event !== "message") return res.sendStatus(200);

    const uid = body.sender.id;
    const msgRaw = body.message.text;
    const msg = clean(msgRaw);
    const db = loadDB();

    if (!userState[uid]) userState[uid] = {};
    const st = userState[uid];

    /* RESET */
    if (["hi", "hello", "menu", "start", "home"].includes(msg)) {
      userState[uid] = {};
      await send(uid, "📦 Main Menu", MAIN_MENU);
      return res.sendStatus(200);
    }

    /* PRICE */
    if (msg === "price") {
      return send(uid, "📁 Select Category",
        kb(db.categories.map((c, i) => ({
          label: `📁 ${c.name}`,
          value: `price_cat_${i}`
        })))
      ).then(() => res.sendStatus(200));
    }

    /* CALC */
    if (msg === "calc") {
      return send(uid, "🧮 Select Category",
        kb(db.categories.map((c, i) => ({
          label: `📁 ${c.name}`,
          value: `calc_cat_${i}`
        })))
      ).then(() => res.sendStatus(200));
    }

    /* ITEM HANDLING (same as yours) */
    if (msg.includes("_item_")) {
      const parts = msg.split("_");
      const mode = parts[0];
      const ci = Number(parts[2]);
      const ii = Number(parts[3]);

      const item = db.categories?.[ci]?.items?.[ii];
      if (!item) return res.sendStatus(200);

      st.item = item;

      if (mode === "calc") {
        st.step = "side";

        return send(uid, "🧮 Select Side",
          kb([
            { label: "1️⃣ One Side", value: "side_1" },
            { label: "2️⃣ Two Side", value: "side_2" }
          ])
        ).then(() => res.sendStatus(200));
      }
    }

    /* SIDE */
    if (msg === "side_1" || msg === "side_2") {
      st.side = msg === "side_2" ? 2 : 1;
      st.step = "qty";

      return send(uid, "📦 Qty:").then(() => res.sendStatus(200));
    }

    /* QTY */
    if (st.step === "qty") {
      const qty = Number(msg);

      if (!Number.isInteger(qty) || qty <= 0) {
        return send(uid, "❌ Qty must be number")
          .then(() => res.sendStatus(200));
      }

      st.qty = qty;

      const price = Number(st.side === 2 ? st.item.s2 : st.item.s1) || 0;
      st.subtotal = price * qty;

      st.step = "charge";

      return send(uid, `🧾 Sub: ${st.subtotal}`)
        .then(() => res.sendStatus(200));
    }

    /* 🔥 FIXED CHARGE */
    if (st.step === "charge") {
      const charge = Number(msgRaw);

      if (msgRaw === "." || isNaN(charge)) {
        return send(uid, "❌ Please enter valid number")
          .then(() => res.sendStatus(200));
      }

      const total = (Number(st.subtotal) || 0) + charge;

      userState[uid] = {};

      return send(uid, `🔥 TOTAL: ${total} Ks`)
        .then(() => res.sendStatus(200));
    }

    return send(uid, "📦 Menu", MAIN_MENU)
      .then(() => res.sendStatus(200));

  } catch (e) {
    console.log("CRASH:", e.message);
    res.sendStatus(200);
  }
});

/* ======================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 RUNNING");
});