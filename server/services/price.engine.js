const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../database/price.db.json");

let DB = null;

// LOAD DB
function loadDB() {
  try {
    const raw = fs.readFileSync(dbPath, "utf8");
    DB = JSON.parse(raw);
    console.log("✅ PRICE DB LOADED");
  } catch (err) {
    console.log("❌ DB ERROR:", err.message);
    DB = { categories: [] };
  }
}

// NORMALIZE (IMPORTANT FIX)
function norm(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")   // 🔥 IMPORTANT FIX
    .replace(/\s+/g, " ")
    .trim();
}

// SMART MATCH (FIXED)
function getPrice(text = "") {
  if (!DB) return null;

  const msg = norm(text);

  for (const cat of DB.categories) {
    for (const item of cat.items) {
      const itemName = norm(item.name);

      // 🔥 SMART MATCH (KEY FIX)
      if (msg.includes(itemName)) {
        let reply = `📄 ${item.name}\n\n`;

        for (const [size, prices] of Object.entries(item.sizes)) {
          reply += `${size}:\n`;
          for (const [side, price] of Object.entries(prices)) {
            reply += `${side} Side: ${price} Ks\n`;
          }
          reply += `\n`;
        }

        return reply.trim();
      }
    }
  }

  return null;
}

module.exports = { loadDB, getPrice };