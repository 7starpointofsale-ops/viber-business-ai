const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(express.json());

// =======================
// ROOT SAFE PATH
const ROOT = process.cwd();

const DB_PATH = path.join(ROOT, "database/price.db.json");
const ADMIN_PATH = path.join(ROOT, "admin");

// =======================
// DB LOAD SAFE
function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify({ categories: [] }, null, 2));
    }

    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw || '{"categories":[]}');
  } catch (e) {
    console.log("DB ERROR:", e.message);
    return { categories: [] };
  }
}

// =======================
// DB SAVE
function saveDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.log("SAVE ERROR:", e.message);
  }
}

// =======================
// ADMIN SAFE FIX (NO path-to-regexp crash)
app.use("/admin", express.static(ADMIN_PATH));

// IMPORTANT: wildcard safe
app.get("/admin*", (req, res) => {
  const filePath = path.join(ADMIN_PATH, "index.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.send("Admin not found");
  }
});

// =======================
// API
app.get("/api/prices", (req, res) => {
  res.json(loadDB());
});

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

    // ================= PRICE
    if (msg === "price") {
      const cats = db.categories || [];

      return send(uid,
        "📁 Select Category",
        kb(cats.map((c, i) => ({
          label: `📁 ${c.name}`,
          value: `price_cat_${i}`
        })))
      ).then(() => res.sendStatus(200));
    }

    // ================= CALC
    if (msg === "calc") {
      const cats = db.categories || [];

      return send(uid,
        "🧮 Select Category",
        kb(cats.map((c, i) => ({
          label: `📁 ${c.name}`,
          value: `calc_cat_${i}`
        })))
      ).then(() => res.sendStatus(200));
    }

    // ================= INVOICE
    if (msg === "invoice") {
      st.cart = [];
      const cats = db.categories || [];

      return send(uid,
        "🧾 Invoice Mode",
        kb(cats.map((c, i) => ({
          label: `📁 ${c.name}`,
          value: `inv_cat_${i}`
        })))
      ).then(() => res.sendStatus(200));
    }

    // ================= CATEGORY FIX
    if (msg.includes("_cat_")) {
      const parts = msg.split("_");
      const mode = parts[0];
      const i = Number(parts[2]);

      const cat = db.categories[i];
      if (!cat || !cat.items) return res.sendStatus(200);

      const items = cat.items.map((it, idx) => ({
        label: `📄 ${it.item} ${it.size || ""}`,
        value: `${mode}_item_${i}_${idx}`
      }));

      return send(uid, `📁 ${cat.name}`, kb(items))
        .then(() => res.sendStatus(200));
    }

    // ================= ITEM FIX
    if (msg.includes("_item_")) {
      const parts = msg.split("_");
      const mode = parts[0];
      const ci = Number(parts[2]);
      const ii = Number(parts[3]);

      const item = db.categories?.[ci]?.items?.[ii];
      if (!item) return res.sendStatus(200);

      st.item = item;

      const s1 = Number(item.s1) || 0;
      const s2 = Number(item.s2) || 0;

      if (mode === "price") {
        return send(uid,
`📄 ${item.item}
📏 ${item.size}
💰 1S: ${s1}
💰 2S: ${s2}`)
        .then(() => res.sendStatus(200));
      }

      if (mode === "calc") {
        st.step = "side";

        return send(uid,
`📄 ${item.item}

🧮 Select Side`,
          kb([
            { label: "1️⃣ One Side", value: "side_1" },
            { label: "2️⃣ Two Side", value: "side_2" }
          ])
        ).then(() => res.sendStatus(200));
      }

      if (mode === "inv") {
        if (!st.cart) st.cart = [];
        st.cart.push(item);
        return send(uid, "✔ Added").then(() => res.sendStatus(200));
      }
    }

    // ================= SIDE
    if (msg === "side_1" || msg === "side_2") {
      st.side = msg === "side_2" ? 2 : 1;
      st.step = "qty";

      return send(uid, "📦 Qty:").then(() => res.sendStatus(200));
    }

    // ================= QTY FIX
    if (st.step === "qty") {
      const qty = Number(msg);
      if (!qty) return send(uid, "❌ number only").then(() => res.sendStatus(200));

      st.qty = qty;

      const price = Number(st.side === 2 ? st.item.s2 : st.item.s1) || 0;
      st.subtotal = price * qty;

      st.step = "charge";

      return send(uid, `🧾 Sub: ${st.subtotal}`)
        .then(() => res.sendStatus(200));
    }

    // ================= FINAL FIX (NO NaN)
    if (st.step === "charge") {
      const charge = Number(msg) || 0;
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

// =======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 PRO FINAL SYSTEM RUNNING (CLEAN + STABLE)");
});