const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(express.json());

// =======================
// SAFE PATH (IMPORTANT FIX)
const DB_PATH = path.join(__dirname, "database/price.db.json");

// =======================
// SAFE DB LOADER
function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify({ categories: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch (e) {
    return { categories: [] };
  }
}

// =======================
// STATIC ADMIN SAFE
const adminPath = path.join(__dirname, "admin");

if (fs.existsSync(adminPath)) {
  app.use("/admin", express.static(adminPath));
  app.get("/admin/*", (req, res) => {
    res.sendFile(path.join(adminPath, "index.html"));
  });
}

// =======================
// STATE
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
// VIBER SEND SAFE
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
  try {
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
      await send(uid, "📦 Main Menu", MAIN_MENU);
      return res.sendStatus(200);
    }

    // PRICE
    if (msg === "price") {
      st.mode = "price";

      const cats = db.categories.map((c, i) => ({
        label: `📁 ${c.name}`,
        value: `price_cat_${i}`
      }));

      await send(uid, "📁 Select Category", kb(cats));
      return res.sendStatus(200);
    }

    // CALC
    if (msg === "calc") {
      st.mode = "calc";

      const cats = db.categories.map((c, i) => ({
        label: `📁 ${c.name}`,
        value: `calc_cat_${i}`
      }));

      await send(uid, "🧮 Select Category", kb(cats));
      return res.sendStatus(200);
    }

    // INVOICE
    if (msg === "invoice") {
      st.mode = "invoice";
      st.cart = [];

      const cats = db.categories.map((c, i) => ({
        label: `📁 ${c.name}`,
        value: `inv_cat_${i}`
      }));

      await send(uid, "🧾 Invoice Mode", kb(cats));
      return res.sendStatus(200);
    }

    // CATEGORY
    if (msg.includes("_cat_")) {
      const parts = msg.split("_");
      const mode = parts[0];
      const i = parts[2];

      const cat = db.categories?.[i];
      if (!cat) return res.sendStatus(200);

      st.catIndex = i;

      const items = cat.items.map((it, idx) => ({
        label: `📄 ${it.item}`,
        value: `${mode}_item_${i}_${idx}`
      }));

      await send(uid, `📁 ${cat.name}`, kb(items));
      return res.sendStatus(200);
    }

    // ITEM
    if (msg.includes("_item_")) {
      const parts = msg.split("_");
      const mode = parts[0];
      const ci = parts[2];
      const ii = parts[3];

      const item = db.categories?.[ci]?.items?.[ii];
      if (!item) return res.sendStatus(200);

      st.item = item;

      if (mode === "price") {
        await send(uid,
`📄 ${item.item}
💰 1S: ${item.s1}
💰 2S: ${item.s2}`);
        return res.sendStatus(200);
      }

      if (mode === "calc") {
        st.step = "side";

        await send(uid,
`📄 ${item.item}

🧮 Select Side`,
          kb([
            { label: "1️⃣ One Side", value: "side_1" },
            { label: "2️⃣ Two Side", value: "side_2" }
          ])
        );

        return res.sendStatus(200);
      }

      if (mode === "inv") {
        if (!st.cart) st.cart = [];

        st.cart.push(item);

        await send(uid, "✔ Added");
        return res.sendStatus(200);
      }
    }

    // SIDE
    if (msg === "side_1" || msg === "side_2") {
      if (!st.item) return res.sendStatus(200);

      st.side = msg === "side_2" ? 2 : 1;
      st.step = "qty";

      await send(uid, "📦 Qty:");
      return res.sendStatus(200);
    }

    // QTY
    if (st.step === "qty") {
      const qty = Number(msg);
      if (!qty) return send(uid, "❌ number only");

      st.qty = qty;

      const price = st.side === 2 ? st.item.s2 : st.item.s1;
      st.subtotal = price * qty;

      st.step = "charge";

      await send(uid, `🧾 Sub: ${st.subtotal}`);
      return res.sendStatus(200);
    }

    // FINAL
    if (st.step === "charge") {
      const charge = Number(msg || 0);
      const total = st.subtotal + charge;

      userState[uid] = {};

      await send(uid, `🔥 TOTAL: ${total} Ks`);
      return res.sendStatus(200);
    }

    await send(uid, "📦 Menu", MAIN_MENU);
    res.sendStatus(200);

  } catch (e) {
    console.log("CRASH FIXED:", e.message);
    res.sendStatus(200);
  }
});

// =======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 DEPLOY SAFE SYSTEM RUNNING");
});