const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

require("dotenv").config();

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "../database/price.db.json");

// =======================
// SESSION MEMORY (in RAM)
// =======================
const sessions = {};

// =======================
// LOAD DB
// =======================
function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

// =======================
// SEND VIBER MESSAGE
// =======================
async function send(userId, text, keyboard = null) {
  const payload = {
    receiver: userId,
    type: "text",
    text
  };

  if (keyboard) payload.keyboard = keyboard;

  await axios.post(
    "https://chatapi.viber.com/pa/send_message",
    payload,
    {
      headers: {
        "X-Viber-Auth-Token": process.env.VIBER_TOKEN
      }
    }
  );
}

// =======================
// MAIN MENU
// =======================
function mainMenu() {
  return {
    Type: "keyboard",
    Buttons: [
      { ActionType: "reply", ActionBody: "MENU_ORDER", Text: "📦 Order" },
      { ActionType: "reply", ActionBody: "MENU_PRICE", Text: "💰 Price Check" },
      { ActionType: "reply", ActionBody: "MENU_CALC", Text: "🧮 Calculator" }
    ]
  };
}

// =======================
// CATEGORY MENU
// =======================
function categoryMenu(db) {
  return {
    Type: "keyboard",
    Buttons: db.categories.map(c => ({
      ActionType: "reply",
      ActionBody: `CAT_${c.name}`,
      Text: c.name
    }))
  };
}

// =======================
// ITEM MENU
// =======================
function itemMenu(cat) {
  return {
    Type: "keyboard",
    Buttons: cat.items.map(i => ({
      ActionType: "reply",
      ActionBody: `ITEM_${i.item}`,
      Text: i.item
    }))
  };
}

// =======================
// SIZE MENU
// =======================
function sizeMenu() {
  return {
    Type: "keyboard",
    Buttons: [
      { ActionType: "reply", ActionBody: "SIZE_A4", Text: "A4" },
      { ActionType: "reply", ActionBody: "SIZE_13X19", Text: "13x19" }
    ]
  };
}

// =======================
// GSM MENU
// =======================
function gsmMenu() {
  return {
    Type: "keyboard",
    Buttons: [
      { ActionType: "reply", ActionBody: "GSM_128", Text: "128gsm" },
      { ActionType: "reply", ActionBody: "GSM_210", Text: "210gsm" },
      { ActionType: "reply", ActionBody: "GSM_250", Text: "250gsm" },
      { ActionType: "reply", ActionBody: "GSM_300", Text: "300gsm" }
    ]
  };
}

// =======================
// SIDE MENU
// =======================
function sideMenu() {
  return {
    Type: "keyboard",
    Buttons: [
      { ActionType: "reply", ActionBody: "SIDE_1", Text: "1 Side" },
      { ActionType: "reply", ActionBody: "SIDE_2", Text: "2 Side" }
    ]
  };
}

// =======================
// WEBHOOK
// =======================
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.event !== "message") return res.sendStatus(200);

  const userId = body.sender.id;
  const msg = body.message.text;

  const db = loadDB();

  // =======================
  // INIT SESSION
  if (!sessions[userId]) {
    sessions[userId] = {};
  }

  const s = sessions[userId];

  // =======================
  // START
  if (msg === "hi" || msg === "hello") {
    s.step = "MAIN";
    await send(userId, "👋 Welcome to 7Star System", mainMenu());
    return res.sendStatus(200);
  }

  // =======================
  // MENU SELECT
  if (msg === "MENU_PRICE") {
    s.step = "CATEGORY";
    await send(userId, "📁 Select Category", categoryMenu(db));
    return res.sendStatus(200);
  }

  if (msg.startsWith("CAT_")) {
    const catName = msg.replace("CAT_", "");
    s.category = db.categories.find(c => c.name === catName);
    s.step = "ITEM";

    await send(userId, "📄 Select Item", itemMenu(s.category));
    return res.sendStatus(200);
  }

  if (msg.startsWith("ITEM_")) {
    const itemName = msg.replace("ITEM_", "");
    s.item = s.category.items.find(i => i.item === itemName);

    s.step = "SIZE";
    await send(userId, "📏 Select Size", sizeMenu());
    return res.sendStatus(200);
  }

  if (msg.startsWith("SIZE_")) {
    s.size = msg.replace("SIZE_", "");
    s.step = "GSM";

    await send(userId, "📄 Select GSM", gsmMenu());
    return res.sendStatus(200);
  }

  if (msg.startsWith("GSM_")) {
    s.gsm = msg.replace("GSM_", "");
    s.step = "SIDE";

    await send(userId, "📄 Select Side", sideMenu());
    return res.sendStatus(200);
  }

  if (msg.startsWith("SIDE_")) {
    s.side = msg.replace("SIDE_", "");

    // =======================
    // PRICE MATCH
    const found = s.item;

    const price =
      s.side === "1"
        ? found.s1
        : found.s2;

    await send(
      userId,
`🧾 RESULT

Item: ${found.item}
Size: ${s.size}
GSM: ${s.gsm}
Side: ${s.side}

💰 Price: ${price} Ks`
    );

    s.step = "DONE";
    return res.sendStatus(200);
  }

  // =======================
  res.sendStatus(200);
});

// =======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 V10 CLICK MENU RUNNING");
});