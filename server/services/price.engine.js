const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../database/price.db.json");

let DB = null;

function loadDB() {
  try {
    DB = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    console.log("✅ DB LOADED");
  } catch (err) {
    console.error("❌ DB ERROR:", err.message);
  }
}

function getPrice(text) {
  if (!DB) return null;

  const msg = text.toLowerCase();

  for (const cat of DB.categories) {
    for (const item of cat.items) {

      if (msg.includes(item.name.toLowerCase())) {

        let sizeKey = Object.keys(item.sizes)[0];
        let side = "1";

        for (const s of Object.keys(item.sizes)) {
          if (msg.includes(s.toLowerCase())) {
            sizeKey = s;
          }
        }

        if (msg.includes("2 side")) side = "2";

        const price = item.sizes[sizeKey][side];

        return `📄 ${item.name}

Size: ${sizeKey}
Side: ${side}
Price: ${price} Ks`;
      }
    }
  }

  return null;
}

module.exports = { loadDB, getPrice };