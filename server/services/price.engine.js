const fs = require("fs");
const path = require("path");

// ✅ FIXED PATH (database folder ထဲက file ကိုယူမယ်)
const dbPath = path.join(__dirname, "../../database/price.db.json");

let db = {};

try {
  const raw = fs.readFileSync(dbPath, "utf8");
  db = JSON.parse(raw);
} catch (err) {
  console.log("❌ PRICE DB ERROR:", err.message);
  db = { categories: [] };
}

// ----------------------------
// PRICE SEARCH ENGINE
// ----------------------------
module.exports = function priceEngine(text) {
  const categories = db.categories || [];

  for (const cat of categories) {
    for (const item of cat.items || []) {
      if (text.toLowerCase().includes(item.name.toLowerCase())) {
        let result = `📄 ${item.name}\n`;

        for (const size in item.sizes) {
          const s = item.sizes[size];
          result += `\n${size}:\n1 Side: ${s["1"] || "-"} Ks\n2 Side: ${s["2"] || "-"} Ks\n`;
        }

        return result;
      }
    }
  }

  return "❌ မတွေ့ပါ";
};