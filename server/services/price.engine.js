const fs = require("fs");
const path = require("path");

// ================================
// 📦 PRICE DB LOAD (SAFE VERSION)
// ================================

// 🔥 Works both local + Render
const dbPath = path.join(process.cwd(), "price.db.json");

let db = {
  categories: []
};

// ================================
// 📥 LOAD DATABASE
// ================================
try {
  const raw = fs.readFileSync(dbPath, "utf-8");
  const parsed = JSON.parse(raw);

// safety check
  if (parsed && Array.isArray(parsed.categories)) {
    db = parsed;
  } else {
    console.error("⚠️ Invalid DB structure: categories not found");
    db = { categories: [] };
  }

} catch (err) {
  console.error("❌ PRICE DB ERROR:", err.message);
  db = { categories: [] };
}

// ================================
// 💰 PRICE ENGINE
// ================================
module.exports = function getPrice(query) {
  try {
    if (!query) return null;

    const text = query.toLowerCase();

    // loop safely
    for (const category of db.categories || []) {
      for (const item of category.items || []) {

        const itemName = item.name.toLowerCase();

        if (text.includes(itemName)) {

          // size match
          for (const sizeKey in item.sizes) {
            if (text.includes(sizeKey.toLowerCase())) {

              const sizeData = item.sizes[sizeKey];

              return {
                category: category.name,
                item: item.name,
                size: sizeKey,
                price: sizeData
              };
            }
          }

          // if no size matched → return item info
          return {
            category: category.name,
            item: item.name,
            sizes: item.sizes
          };
        }
      }
    }

    return null;

  } catch (err) {
    console.error("PRICE ENGINE ERROR:", err.message);
    return null;
  }
};