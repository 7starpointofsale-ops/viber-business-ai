const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(express.json());

// =======================
// DB PATH
const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// SAFE DB
let DB_CACHE = null;

function loadDB() {
  try {
    DB_CACHE = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    DB_CACHE = { categories: [] };
  }
  return DB_CACHE;
}

function saveDB(data) {
  DB_CACHE = data;
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// refresh cache
setInterval(() => (DB_CACHE = null), 5000);

// =======================
// STATIC ADMIN (FIXED)
const adminPath = path.join(__dirname, "../admin");

app.use("/admin", express.static(adminPath, {
  index: "index.html"
}));

app.get("/admin/*", (req, res) => {
  res.sendFile(path.join(adminPath, "index.html"));
});

// =======================
// USER STATE SAFE
const userState = {};

// =======================
// CLEAN
function clean(msg) {
  return (msg || "")
    .replace(/[📁📄💰🧮📦🧾]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

// =======================
// VIBER SEND
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
  } catch (e) {}
}

// =======================
// KEYBOARD
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

// =======================
// MAIN MENU
const MAIN_MENU = kb([
  { label: "💰 ဈေးမေးမယ်", value: "price" },
  { label: "🧮 ဈေးတွက်မယ်", value: "calc" },
  { label: "🧾 Invoice", value: "invoice" }
]);

// =======================
// WEBHOOK
app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.event !== "message") return res.sendStatus(200);

  const uid = body.sender.id;
  const msg = clean(body.message.text);
  const db = loadDB();

  if (!userState[uid]) userState[uid] = {};
  const st = userState[uid];

  // RESET
  if (["hi", "hello", "menu", "start"].includes(msg)) {
    userState[uid] = {};
    return send(uid, "📦 Main Menu", MAIN_MENU).then(() => res.sendStatus(200));
  }

  // PRICE
  if (msg === "price") {
    st.mode = "price";

    const cats = db.categories.map((c, i) => ({
      label: `📁 ${c.name}`,
      value: `price_cat_${i}`
    }));

    return send(uid, "📁 Select Category", kb(cats)).then(() =>
      res.sendStatus(200)
    );
  }

  // CALC
  if (msg === "calc") {
    st.mode = "calc";
    st.step = "cat";

    const cats = db.categories.map((c, i) => ({
      label: `📁 ${c.name}`,
      value: `calc_cat_${i}`
    }));

    return send(uid, "🧮 Select Category", kb(cats)).then(() =>
      res.sendStatus(200)
    );
  }

  // INVOICE
  if (msg === "invoice") {
    st.mode = "invoice";
    st.step = "cat";
    st.cart = [];

    const cats = db.categories.map((c, i) => ({
      label: `📁 ${c.name}`,
      value: `inv_cat_${i}`
    }));

    return send(uid, "🧾 Invoice Mode", kb(cats)).then(() =>
      res.sendStatus(200)
    );
  }

  // CATEGORY
  if (msg.includes("_cat_")) {
    const [mode, , i] = msg.split("_");
    const cat = db.categories[i];
    if (!cat) return res.sendStatus(200);

    st.catIndex = i;

    const items = cat.items.map((it, idx) => ({
      label: `📄 ${it.item} ${it.size || ""}`,
      value: `${mode}_item_${i}_${idx}`
    }));

    return send(uid, `📁 ${cat.name}`, kb(items)).then(() =>
      res.sendStatus(200)
    );
  }

  // ITEM
  if (msg.includes("_item_")) {
    const [mode, , ci, ii] = msg.split("_");
    const item = db.categories[ci]?.items[ii];
    if (!item) return res.sendStatus(200);

    st.item = item;

    if (mode === "price") {
      return send(uid,
`📄 ${item.item}
📏 ${item.size}
💰 1S: ${item.s1}
💰 2S: ${item.s2}`
      ).then(() => res.sendStatus(200));
    }

    if (mode === "calc") {
      st.step = "side";

      return send(uid,
`📄 ${item.item}
📏 ${item.size}

🧮 Select Side`,
        kb([
          { label: "1️⃣ One Side", value: "side_1" },
          { label: "2️⃣ Two Side", value: "side_2" }
        ])
      ).then(() => res.sendStatus(200));
    }

    if (mode === "inv") {
      st.cart.push({
        name: item.item,
        size: item.size,
        price: item.s1,
        qty: 1
      });

      return send(uid, "✔ Added to Invoice").then(() =>
        res.sendStatus(200)
      );
    }
  }

  // SIDE
  if (msg === "side_1" || msg === "side_2") {
    if (!st.item) return res.sendStatus(200);

    st.side = msg === "side_2" ? 2 : 1;
    st.step = "qty";

    return send(uid, "📦 Enter Qty:").then(() => res.sendStatus(200));
  }

  // QTY
  if (st.step === "qty") {
    const qty = Number(msg);
    if (!qty) return send(uid, "❌ number only").then(() => res.sendStatus(200));

    st.qty = qty;

    const price = st.side === 2 ? st.item.s2 : st.item.s1;
    st.subtotal = price * qty;

    st.step = "charge";

    return send(uid,
`🧾 RESULT
📄 ${st.item.item}
📦 Qty: ${qty}
💰 Sub: ${st.subtotal}

➕ Charge?`
    ).then(() => res.sendStatus(200));
  }

  // FINAL
  if (st.step === "charge") {
    const charge = Number(msg || 0);
    const total = st.subtotal + charge;

    userState[uid] = {};

    return send(uid,
`🧾 FINAL

📄 ${st.item.item}
📦 Qty: ${st.qty}
💰 Sub: ${st.subtotal}
➕ Charge: ${charge}

🔥 TOTAL: ${total} Ks`
    ).then(() => res.sendStatus(200));
  }

  return send(uid, "📦 Menu", MAIN_MENU).then(() => res.sendStatus(200));
});

// =======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 STABLE V10 FIXED SYSTEM RUNNING");
});