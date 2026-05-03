const fs = require("fs");
const path = require("path");

let DB = null;

// FIXED PATH (Render + Local OK)
const dbPath = path.join(__dirname, "../database/price.db.json");

function loadDB() {
  try {
    const raw = fs.readFileSync(dbPath, "utf8");
    DB = JSON.parse(raw);
    console.log("✅ PRICE DB LOADED");
  } catch (err) {
    console.error("❌ PRICE DB LOAD ERROR:", err.message);
    DB = { categories: [] };
  }
}

// normalize text
function norm(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// fuzzy search
function getPrice(text = "") {
  if (!DB) return null;

  const msg = norm(text);

  for (const cat of DB.categories) {
    for (const item of cat.items) {
      const itemName = norm(item.name);

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