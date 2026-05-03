const fs = require("fs");
const path = require("path");

let DB = null;

// FIXED PATH (Render + Local both work)
const DB_PATH = path.join(__dirname, "../database/price.db.json");

function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.error("❌ PRICE DB NOT FOUND:", DB_PATH);
      DB = { categories: [] };
      return;
    }

    DB = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    console.log("✅ Price DB Loaded");
  } catch (err) {
    console.error("❌ DB LOAD ERROR:", err.message);
    DB = { categories: [] };
  }
}

function getPrice(text = "") {
  if (!DB || !DB.categories) return null;

  const msg = text.toLowerCase();

  for (const cat of DB.categories) {
    for (const item of cat.items) {
      const itemName = item.name.toLowerCase();

      if (msg.includes(itemName.toLowerCase())) {
        let sizeKey = null;

        if (msg.includes("a4")) sizeKey = "A4";
        if (msg.includes("13x19")) sizeKey = "13x19";
        if (msg.includes("legal")) sizeKey = "Legal";

        if (!sizeKey) {
          return `📄 ${item.name}\nSize လိုအပ်ပါတယ် (A4 / 13x19 / Legal)`;
        }

        const sizeData = item.sizes[sizeKey];
        if (!sizeData) return "❌ Size မတွေ့ပါ";

        let side = "1";
        if (msg.includes("2 side")) side = "2";

        const price = sizeData[side];

        if (!price) return "❌ Price မရှိပါ";

        return `📄 ${item.name}\n${sizeKey}:\n${side} Side: ${price} Ks`;
      }
    }
  }

  return null;
}

module.exports = { loadDB, getPrice };