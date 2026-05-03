const fs = require("fs");
const path = require("path");

let DB = null;

// FIXED PATH (IMPORTANT)
const DB_PATH = path.join(__dirname, "../database/price.db.json");

function loadDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    DB = JSON.parse(raw);
    console.log("✅ PRICE DB LOADED");
  } catch (err) {
    console.error("❌ DB LOAD ERROR:", err.message);
  }
}

function normalize(str) {
  return (str || "").toLowerCase().trim();
}

function getPrice(text) {
  if (!DB) return null;

  const input = normalize(text);

  for (const cat of DB.categories) {
    for (const item of cat.items) {
      const itemName = normalize(item.name);

      if (input.includes(itemName)) {
        let sizeFound = null;
        let sideFound = "1";

        for (const sizeKey of Object.keys(item.sizes)) {
          if (input.includes(sizeKey.toLowerCase())) {
            sizeFound = sizeKey;
          }
        }

        if (!sizeFound) sizeFound = Object.keys(item.sizes)[0];

        if (input.includes("2 side")) sideFound = "2";

        const price = item.sizes[sizeFound][sideFound];

        return `📄 ${item.name}

Size: ${sizeFound}
Side: ${sideFound}
Price: ${price} Ks`;
      }
    }
  }

  return null;
}

module.exports = {
  loadDB,
  getPrice
};