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
    if (!DB_CACHE.categories) DB_CACHE.categories = [];
  } catch {
    DB_CACHE = { categories: [] };
  }
  return DB_CACHE;
}

function saveDB(data) {
  DB_CACHE = data;
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// =======================
// ADMIN (FIXED - ALWAYS LOADS)
const adminPath = path.join(__dirname, "../admin");

app.use("/admin", express.static(adminPath));
app.get("/admin/*", (req, res) => {
  res.sendFile(path.join(adminPath, "index.html"));
});

// =======================
// USER STATE SAFE
const userState = {};

// =======================
// CLEAN TEXT
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
    const msg = clean(body.message.text || "");
    const db = loadDB();

    if (!userState[uid]) userState[uid] = {};
    const st = userState[uid];

    // ================= RESET
    if (["hi", "hello", "menu", "start"].includes(msg)) {
      userState[uid] = {};
      await send(uid, "📦 Main Menu", MAIN_MENU);
      return res.sendStatus(200);
    }

    // ================= PRICE
    if (msg === "price") {
      st.mode = "price";

      const cats = db.categories.map((c, i) => ({
        label: `📁 ${c.name}`,
        value: `price_cat_${i}`
      }));

      await send(uid, "📁 Select Category", kb(cats));
      return res.sendStatus(200);
    }

    // ================= CALC
    if (msg === "calc") {
      st.mode = "calc";

      const cats = db.categories.map((c, i) => ({
        label: `📁 ${c.name}`,
        value: `calc_cat_${i}`
      }));

      await send(uid, "🧮 Select Category", kb(cats));
      return res.sendStatus(200);
    }

    // ================= INVOICE
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

    // ================= CATEGORY FIX (IMPORTANT)
    if (msg.includes("_cat_")) {
      const parts = msg.split("_");
      const mode = parts[0];
      const i = parts[2];

      const cat = db.categories[i];
      if (!cat) return res.sendStatus(200);

      st.catIndex = i;

      const items = cat.items.map((it, idx) => ({
        label: `📄 ${it.item} ${it.size || ""}`,
        value: `${mode}_item_${i}_${idx}`
      }));

      await send(uid, `📁 ${cat.name}`, kb(items));
      return res.sendStatus(200);
    }

    // ================= ITEM FIX
    if (msg.includes("_item_")) {
      const parts = msg.split("_");
      const mode = parts[0];
      const ci = parts[2];
      const ii = parts[3];

      const item = db.categories?.[ci]?.items?.[ii];
      if (!item) return res.sendStatus(200);

      st.item = item;

      // PRICE MODE
      if (mode === "price") {
        await send(uid,
`📄 ${item.item}
📏 ${item.size || "-"}
💰 1S: ${item.s1}
💰 2S: ${item.s2}`
        );
        return res.sendStatus(200);
      }

      // CALC MODE
      if (mode === "calc") {
        st.step = "side";

        await send(uid,
`📄 ${item.item}
📏 ${item.size || "-"}

🧮 Select Side`,
          kb([
            { label: "1️⃣ One Side", value: "side_1" },
            { label: "2️⃣ Two Side", value: "side_2" }
          ])
        );

        return res.sendStatus(200);
      }

      // INVOICE MODE (SAFE)
      if (mode === "inv") {
        if (!st.cart) st.cart = [];

        st.cart.push({
          name: item.item,
          size: item.size,
          price: item.s1,
          qty: 1
        });

        await send(uid, "✔ Added to Invoice");
        return res.sendStatus(200);
      }
    }

    // ================= SIDE
    if (msg === "side_1" || msg === "side_2") {
      if (!st.item) return res.sendStatus(200);

      st.side = msg === "side_2" ? 2 : 1;
      st.step = "qty";

      await send(uid, "📦 Enter Qty:");
      return res.sendStatus(200);
    }

    // ================= QTY
    if (st.step === "qty") {
      const qty = Number(msg);
      if (!qty) {
        await send(uid, "❌ number only");
        return res.sendStatus(200);
      }

      st.qty = qty;

      const price = st.side === 2 ? st.item.s2 : st.item.s1;
      st.subtotal = price * qty;

      st.step = "charge";

      await send(uid,
`🧾 RESULT

📄 ${st.item.item}
📦 Qty: ${qty}
💰 Sub: ${st.subtotal}

➕ Charge?`);
      return res.sendStatus(200);
    }

    // ================= FINAL
    if (st.step === "charge") {
      const charge = Number(msg || 0);
      const total = st.subtotal + charge;

      userState[uid] = {};

      await send(uid,
`🧾 FINAL

📄 ${st.item.item}
📦 Qty: ${st.qty}
💰 Sub: ${st.subtotal}
➕ Charge: ${charge}

🔥 TOTAL: ${total} Ks`);

      return res.sendStatus(200);
    }

    await send(uid, "📦 Menu", MAIN_MENU);
    res.sendStatus(200);

  } catch (err) {
    console.log("WEBHOOK ERROR:", err.message);
    res.sendStatus(200);
  }
});

// =======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 STABLE FULL FIX SYSTEM RUNNING");
});