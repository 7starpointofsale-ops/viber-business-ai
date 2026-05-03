const fs = require("fs");
const path = require("path");

// 🔥 Render + local safe path
const dbPath = path.join(process.cwd(), "price.db.json");

let db = {
  categories: []
};

// ✅ Load DB safely
function loadDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      console.log("❌ PRICE DB FILE NOT FOUND:", dbPath);
      return db;
    }

    const raw = fs.readFileSync(dbPath, "utf-8");
    const parsed = JSON.parse(raw);

    if (!parsed || !Array.isArray(parsed.categories)) {
      console.log("❌ INVALID PRICE DB FORMAT");
      return db;
    }

    db = parsed;
    return db;

  } catch (err) {
    console.log("❌ PRICE DB ERROR:", err);
    return db;
  }
}

// load at startup
loadDB();

// 🔥 Price search engine
module.exports = function (text) {
  const data = loadDB();

  if (!data.categories || !Array.isArray(data.categories)) {
    return "❌ Price data မတွေ့ပါ";
  }

  text = text.toLowerCase();

  for (const cat of data.categories) {
    for (const item of cat.items) {
      if (text.includes(item.name.toLowerCase())) {

        let result = `📄 ${item.name}\n`;

        for (const size in item.sizes) {
          const s = item.sizes[size];

          result += `\n${size}:\n`;
          result += `1 Side: ${s["1"] || "-"} Ks\n`;
          result += `2 Side: ${s["2"] || "-"} Ks\n`;
        }

        return result;
      }
    }
  }

  return "❌ မတွေ့ပါ";
};