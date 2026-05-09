const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// =======================================
// PATH
// =======================================
const DB_PATH = path.join(__dirname, "../database/price.db.json");
const ORDER_DB = path.join(__dirname, "../database/orders.db.json");

// =======================================
// STATIC
// =======================================
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =======================================
// SAFE FILE INIT
// =======================================
function ensureFile(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }
}

ensureFile(DB_PATH, { categories: [] });
ensureFile(ORDER_DB, { orders: [] });

// =======================================
// CACHE
// =======================================
let dbCache = null;
let lastLoad = 0;

function loadDB() {
  try {
    const now = Date.now();

    if (dbCache && now - lastLoad < 3000) {
      return dbCache;
    }

    dbCache = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));

    if (!dbCache.categories) {
      dbCache.categories = [];
    }

    lastLoad = now;

    return dbCache;
  } catch (e) {
    console.log("DB LOAD ERROR:", e.message);

    return {
      categories: []
    };
  }
}

function saveDB(data) {
  dbCache = data;
  lastLoad = Date.now();

  fs.writeFileSync(
    DB_PATH,
    JSON.stringify(data, null, 2)
  );
}

function loadOrders() {
  try {
    return JSON.parse(
      fs.readFileSync(ORDER_DB, "utf8")
    );
  } catch {
    return {
      orders: []
    };
  }
}

function saveOrders(data) {
  fs.writeFileSync(
    ORDER_DB,
    JSON.stringify(data, null, 2)
  );
}

// =======================================
// CLEAN
// =======================================
function clean(msg = "") {
  return msg
    .replace(/[📁📄💰🧮📦🧾]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

// =======================================
// NUMBER
// =======================================
function normalizeNumber(msg = "") {
  const map = {
    "၀": "0",
    "၁": "1",
    "၂": "2",
    "၃": "3",
    "၄": "4",
    "၅": "5",
    "၆": "6",
    "၇": "7",
    "၈": "8",
    "၉": "9"
  };

  return msg
    .split("")
    .map(c => map[c] ?? c)
    .join("");
}

function isNumber(msg) {
  return /^\d+$/.test(
    normalizeNumber(msg)
  );
}

// =======================================
function safe(v) {
  return (
    v === undefined ||
    v === null ||
    v === ""
  )
    ? "-"
    : v;
}

function formatPrice(n) {
  return Number(n || 0).toLocaleString();
}

// =======================================
// STATE
// =======================================
const userState = {};

// =======================================
// DUPLICATE BLOCKER
// =======================================
const recentMessages = {};

// =======================================
// TEST MODE
// =======================================
// true = only your account works
// false = everyone works
const TEST_MODE = false;

// YOUR VIBER ID
const OWNER_ID = "";

// =======================================
// MENU
// =======================================
const SERVICE_MENU = [
  {
    label: "💰 ဈေးမေးမယ်",
    value: "service_price"
  },
  {
    label: "🧮 ဈေးတွက်မယ်",
    value: "service_calc"
  }
];

// =======================================
const commandMap = {
  "ဈေးတွက်မယ်": "service_calc",
  "ဈေးမေးမယ်": "service_price",
  "calc": "service_calc",
  "price": "service_price"
};

const ignoreMsgs = [
  ".",
  "home",
  "back",
  "menu",
  "start"
];

// =======================================
// SEND
// =======================================
async function send(
  userId,
  text,
  keyboard = null
) {
  try {
    const body = {
      receiver: userId,
      type: "text",
      text,
      min_api_version: 7
    };

    if (keyboard) {
      body.keyboard = keyboard;
    }

    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      body,
      {
        timeout: 10000,
        headers: {
          "X-Viber-Auth-Token":
            process.env.VIBER_TOKEN
        }
      }
    );
  } catch (e) {
    console.log(
      "SEND ERROR:",
      e.message
    );
  }
}

// =======================================
// KEYBOARD
// =======================================
function kb(items) {
  return {
    Type: "keyboard",
    DefaultHeight: false,

    Buttons: items.map(i => ({
      Columns: 3,
      Rows: 1,
      BgColor: "#2d3748",
      ActionType: "reply",
      ActionBody: i.value,
      Text: `<font color="#ffffff">${i.label}</font>`
    }))
  };
}

// =======================================
// SMART SEARCH
// =======================================
function findItemSmart(db, msg) {

  if (!db?.categories) {
    return null;
  }

  let best = null;
  let bestScore = 0;

  const tokens = msg.split(" ");

  db.categories.forEach(c => {

    (c.items || []).forEach(i => {

      let score = 0;

      const name =
        String(i.item || "")
        .toLowerCase();

      const size =
        String(i.size || "")
        .toLowerCase();

      const gsm =
        String(i.gsm || "")
        .toLowerCase();

      tokens.forEach(t => {

        if (name.includes(t)) {
          score += 5;
        }

        if (size.includes(t)) {
          score += 3;
        }

        if (gsm.includes(t)) {
          score += 2;
        }

      });

      if (score > bestScore) {
        bestScore = score;
        best = i;
      }

    });

  });

  return best;
}

// =======================================
// API
// =======================================
app.get("/api/prices", (req, res) => {
  res.json(loadDB());
});

// =======================================
// SAVE
// =======================================
app.post("/api/save-v2", (req, res) => {

  try {

    const {
      category,
      item,
      size,
      gsm,
      s1,
      s2,
      lamination,
      remark,
      noSide
    } = req.body;

    const db = loadDB();

    let cat = db.categories.find(
      c =>
        c.name.toLowerCase()
        === String(category).toLowerCase()
    );

    if (!cat) {

      cat = {
        name: category,
        items: []
      };

      db.categories.push(cat);
    }

    cat.items.push({
      id: Date.now().toString(),
      item,
      size,
      gsm,
      s1: Number(s1 || 0),
      s2: Number(s2 || 0),
      lamination,
      remark,
      noSide: !!noSide
    });

    saveDB(db);

    res.json({
      ok: true
    });

  } catch (e) {

    console.log(e);

    res.status(500).json({
      ok: false
    });
  }
});

// =======================================
// UPDATE
// =======================================
app.post("/api/update-entry", (req, res) => {

  try {

    const {
      id,
      field,
      value
    } = req.body;

    const db = loadDB();

    db.categories.forEach(c => {

      c.items.forEach(i => {

        if (i.id === id) {

          if (
            field === "s1" ||
            field === "s2"
          ) {
            i[field] = Number(value || 0);
          } else {
            i[field] = value;
          }

        }

      });

    });

    saveDB(db);

    res.json({
      ok: true
    });

  } catch {

    res.status(500).json({
      ok: false
    });
  }
});

// =======================================
// DELETE
// =======================================
app.post("/api/delete-entry", (req, res) => {

  try {

    const { id } = req.body;

    const db = loadDB();

    db.categories.forEach(c => {

      c.items =
        c.items.filter(
          i => i.id !== id
        );

    });

    saveDB(db);

    res.json({
      ok: true
    });

  } catch {

    res.status(500).json({
      ok: false
    });
  }
});

// =======================================
// ORDERS
// =======================================
app.get("/api/orders", (req, res) => {
  res.json(loadOrders());
});

// =======================================
// WEBHOOK
// =======================================
app.post("/webhook", async (req, res) => {

  // IMPORTANT
  res.sendStatus(200);

  try {

    const body = req.body;

    // ===================================
    // IGNORE NON MESSAGE
    // ===================================
    if (
      body.event !== "message"
    ) {
      return;
    }

    const userId =
      body.sender.id;

    // ===================================
    // TEST MODE
    // ===================================
    if (
      TEST_MODE &&
      OWNER_ID &&
      userId !== OWNER_ID
    ) {
      return;
    }

    // ===================================
    // DUPLICATE BLOCK
    // ===================================
    const msgToken =
      userId +
      "_" +
      body.message.token;

    if (
      recentMessages[msgToken]
    ) {
      return;
    }

    recentMessages[msgToken] = true;

    setTimeout(() => {
      delete recentMessages[msgToken];
    }, 30000);

    // ===================================
    let msg =
      clean(
        body.message.text || ""
      );

    msg =
      commandMap[msg] || msg;

    msg =
      normalizeNumber(msg);

    const db = loadDB();

    const state =
      userState[userId];

    // ===================================
    // RESET
    // ===================================
    if (
      ignoreMsgs.includes(msg)
    ) {

      delete userState[userId];

      await send(
        userId,
        "📦 7Star System",
        kb(SERVICE_MENU)
      );

      return;
    }

    // ===================================
    // MENU
    // ===================================
    if (
      [
        "hi",
        "hello",
        "start",
        "menu",
        "မင်္ဂလာပါ"
      ].includes(msg)
    ) {

      await send(
        userId,
        "📦 7Star System",
        kb(SERVICE_MENU)
      );

      return;
    }

    // ===================================
    // PRICE
    // ===================================
    if (
      msg === "service_price"
    ) {

      const cats =
        (db.categories || [])
        .map((c, i) => ({
          label:
            `📁 ${c.name}`,
          value:
            `cat_${i}`
        }));

      await send(
        userId,
        "📁 Category",
        kb(cats)
      );

      return;
    }

    // ===================================
    // CALC
    // ===================================
    if (
      msg === "service_calc"
    ) {

      userState[userId] = {
        mode: "calc"
      };

      const cats =
        (db.categories || [])
        .map((c, i) => ({
          label:
            `📁 ${c.name}`,
          value:
            `cat_${i}`
        }));

      await send(
        userId,
        "🧮 Category",
        kb(cats)
      );

      return;
    }

    // ===================================
    // CATEGORY
    // ===================================
    if (
      msg.startsWith("cat_")
    ) {

      const idx =
        Number(
          msg.replace(
            "cat_",
            ""
          )
        );

      const cat =
        db.categories[idx];

      if (!cat) {
        return;
      }

      const items =
        (cat.items || [])
        .map((it, i) => ({
          label:
            `📄 ${it.item}`,
          value:
            `item_${idx}_${i}`
        }));

      await send(
        userId,
        `📁 ${cat.name}`,
        kb(items)
      );

      return;
    }

    // ===================================
    // ITEM
    // ===================================
    if (
      msg.startsWith("item_")
    ) {

      const parts =
        msg.split("_");

      const item =
        db.categories?.[
          parts[1]
        ]?.items?.[
          parts[2]
        ];

      if (!item) {
        return;
      }

      // CALC
      if (
        state?.mode === "calc"
      ) {

        userState[userId] = {
          mode: "qty",
          item
        };

        await send(
          userId,
`📄 ${item.item}

📏 ${safe(item.size)}
📦 ${safe(item.gsm)}

👉 Qty ?`
        );

        return;
      }

      // PRICE
      let text =
`📄 ${item.item}

📏 ${safe(item.size)}
📦 ${safe(item.gsm)}`;

      if (item.noSide) {

        text +=
`

💰 Price:
${formatPrice(item.s1)} Ks`;

      } else {

        text +=
`

💰 1 Side:
${formatPrice(item.s1)} Ks

💰 2 Side:
${formatPrice(item.s2)} Ks`;

      }

      await send(
        userId,
        text
      );

      return;
    }

    // ===================================
    // QTY
    // ===================================
    if (
      state?.mode === "qty"
    ) {

      if (!isNumber(msg)) {

        await send(
          userId,
          "❌ Number only"
        );

        return;
      }

      const qty =
        Number(
          normalizeNumber(msg)
        );

      const total =
        Number(
          state.item.s1 || 0
        ) * qty;

      await send(
        userId,
`📦 RESULT

📄 ${state.item.item}

📦 Qty:
${qty}

💰 Total:
${formatPrice(total)} Ks`
      );

      delete userState[userId];

      return;
    }

    // ===================================
    // SMART SEARCH
    // ===================================
    if (!state) {

      const item =
        findItemSmart(
          db,
          msg
        );

      if (item) {

        await send(
          userId,
`📄 ${item.item}

📏 ${safe(item.size)}
📦 ${safe(item.gsm)}`
        );

        return;
      }
    }

    // ===================================
    await send(
      userId,
      "📦 Select Service",
      kb(SERVICE_MENU)
    );

  } catch (e) {

    console.log(
      "WEBHOOK ERROR:",
      e.message
    );
  }
});

// =======================================
const PORT =
  process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(
    "🚀 SYSTEM RUNNING ON",
    PORT
  );
});