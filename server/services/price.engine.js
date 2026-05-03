const fs = require("fs");
const path = require("path");

// =======================
// 📦 SAFE DB LOADER
// =======================
function loadDB() {
  try {
    // Render + local safe path fix
    const filePath = path.join(__dirname, "../../price.db.json");

    if (!fs.existsSync(filePath)) {
      console.log("❌ PRICE DB FILE NOT FOUND:", filePath);
      return { categories: [] };
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(raw);

    if (!json || !Array.isArray(json.categories)) {
      console.log("❌ INVALID DB STRUCTURE");
      return { categories: [] };
    }

    return json;
  } catch (err) {
    console.log("❌ PRICE DB ERROR:", err.message);
    return { categories: [] };
  }
}

// =======================
// 🔍 PRICE SEARCH ENGINE
// =======================
function findPrice(message = "") {
  const db = loadDB();

  const text = message.toLowerCase();

  const categories = Array.isArray(db.categories) ? db.categories : [];

  for (const cat of categories) {
    for (const item of cat.items || []) {
      const itemName = (item.name || "").toLowerCase();

      if (text.includes(itemName)) {
        for (const sizeKey in item.sizes || {}) {
          const sizeData = item.sizes[sizeKey];

          return {
            found: true,
            reply:
              `📄 ${item.name}\n` +
              `📦 Size: ${sizeKey}\n` +
              `1 Side: ${sizeData["1"] || "-"} Ks\n` +
              `2 Side: ${sizeData["2"] || "-"} Ks`
          };
        }
      }
    }
  }

  return {
    found: false,
    reply: "❌ မတွေ့ပါ\n📌 Item name သေချာရေးပေးပါ"
  };
}

// =======================
// 🤖 BOT ENTRY POINT
// =======================
module.exports = function handlePriceEngine(message) {
  if (!message) {
    return "❌ Empty message";
  }

  const result = findPrice(message);

  return result.reply;
};