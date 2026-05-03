const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../../database/price.db.json");

let DB = null;

// =====================
// LOAD DB SAFE
// =====================
function loadDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      console.error("❌ DB NOT FOUND:", dbPath);
      DB = { categories: [] };
      return;
    }

    DB = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    console.log("✅ DB LOADED");
  } catch (e) {
    console.error("❌ DB ERROR:", e.message);
    DB = { categories: [] };
  }
}

// =====================
// SMART NORMALIZER
// =====================
function normalize(text = "") {
  return text
    .toLowerCase()
    .replace(/g/g, "") // 250g -> 250
    .replace(/\s+/g, " ")
    .trim();
}

// =====================
// PRICE FINDER (SMART)
// =====================
function getPrice(text = "") {
  if (!DB) return null;

  const msg = normalize(text);

  for (const cat of DB.categories) {
    for (const item of cat.items) {
      const itemName = normalize(item.name);

      // fuzzy match (important fix)
      if (
        msg.includes(itemName.split(" ")[0]) ||
        itemName.split(" ")[0].includes(msg.split(" ")[0])
      ) {
        const sizeKey = Object.keys(item.sizes)[0];
        const side = msg.includes("2") ? "2" : "1";

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