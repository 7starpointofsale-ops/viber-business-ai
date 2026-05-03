const fs = require("fs");
const path = require("path");

// ✅ FIXED PATH (IMPORTANT)
const dbPath = path.join(__dirname, "../../database/price.db.json");

// load db safely
function loadDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      console.error("❌ PRICE DB FILE NOT FOUND:", dbPath);
      return { categories: [] };
    }

    const raw = fs.readFileSync(dbPath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("❌ PRICE DB LOAD ERROR:", err);
    return { categories: [] };
  }
}

// normalize text
function norm(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\u1000-\u109f+]/gi, "")
    .trim();
}

// main engine
module.exports = function (msg) {
  const db = loadDB();

  const input = norm(msg);

  for (const cat of db.categories || []) {
    for (const item of cat.items || []) {
      const itemName = norm(item.name);

      if (input.includes(itemName)) {
        let result = `📄 ${item.name}\n\n`;

        for (const size in item.sizes) {
          const price = item.sizes[size];

          result += `${size}:\n`;

          if (price["1"]) result += `1 Side: ${price["1"]} Ks\n`;
          if (price["2"]) result += `2 Side: ${price["2"]} Ks\n`;

          result += `\n`;
        }

        return result;
      }
    }
  }

  return "❌ မတွေ့ပါ";
};