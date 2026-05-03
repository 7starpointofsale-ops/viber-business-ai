const fs = require("fs");
const path = require("path");

// ❌ wrong (server/database ကိုရှာနေတယ်)
// const dbPath = path.join(__dirname, "../database/price.db.json");

// ✅ FIXED (root database folder)
const dbPath = path.join(__dirname, "../../database/price.db.json");

let DB = null;

function loadDB() {
  try {
    const raw = fs.readFileSync(dbPath, "utf-8");
    DB = JSON.parse(raw);
    console.log("✅ PRICE DB LOADED");
  } catch (err) {
    console.error("❌ DB ERROR:", err.message);
  }
}

function getPrice(text = "") {
  if (!DB) return null;

  const msg = text.toLowerCase();

  for (const cat of DB.categories) {
    for (const item of cat.items) {
      if (msg.includes(item.name.toLowerCase())) {
        const sizeKey = Object.keys(item.sizes)[0];
        const side = msg.includes("2 side") ? "2" : "1";

        const price = item.sizes[sizeKey]?.[side];

        if (price) {
          return `📄 ${item.name}\n\n${sizeKey}:\n${side} Side: ${price} Ks`;
        }
      }
    }
  }

  return null;
}

module.exports = { loadDB, getPrice };