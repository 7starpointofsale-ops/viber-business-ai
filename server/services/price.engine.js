const fs = require("fs");
const path = require("path");

// 👉 FIXED PATH (YOUR STRUCTURE)
const dbPath = path.join(__dirname, "../../database/price.db.json");

let DB = null;

// ===============================
// LOAD DB SAFE
// ===============================
function loadDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      console.error("❌ PRICE DB FILE NOT FOUND:", dbPath);
      DB = { categories: [] };
      return;
    }

    const raw = fs.readFileSync(dbPath, "utf-8");
    DB = JSON.parse(raw);

    console.log("✅ PRICE DB LOADED");
  } catch (err) {
    console.error("❌ DB LOAD ERROR:", err.message);
    DB = { categories: [] };
  }
}

// ===============================
// PRICE SEARCH ENGINE
// ===============================
function getPrice(text = "") {
  if (!DB || !DB.categories) return null;

  const msg = text.toLowerCase();

  for (const cat of DB.categories) {
    for (const item of cat.items) {
      const name = item.name.toLowerCase();

      if (msg.includes(name)) {
        const sizeKeys = Object.keys(item.sizes);
        const size = sizeKeys[0];

        const side = msg.includes("2 side") ? "2" : "1";
        const price = item.sizes[size]?.[side];

        if (!price) return `❌ Price မတွေ့ပါ`;

        return `📄 ${item.name}\n\n${size}:\n${side} Side: ${price} Ks`;
      }
    }
  }

  return null;
}

module.exports = { loadDB, getPrice };