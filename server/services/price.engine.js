const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../price.db.json");

let db = { categories: [] };

try {
  db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
} catch (err) {
  console.error("PRICE DB ERROR:", err);
}

// 🔥 normalize helper
function norm(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * 🔍 SMART FIND ENGINE
 * input: "art card 250 a4 1side"
 */
exports.find = (input) => {
  if (!input) return null;

  const query = norm(input);

  for (const cat of db.categories) {
    for (const item of cat.items) {
      const itemName = norm(item.name);

      if (query.includes(itemName)) {

        // 🔍 size detect
        let selectedSize = null;
        let selectedPrice = null;

        for (const sizeKey in item.sizes) {
          const sizeNorm = norm(sizeKey);

          if (query.includes(sizeNorm)) {
            selectedSize = sizeKey;
            break;
          }
        }

        // fallback size (first one)
        if (!selectedSize) {
          selectedSize = Object.keys(item.sizes)[0];
        }

        const sizeData = item.sizes[selectedSize];

        // 🔢 side detect (1 / 2)
        let side = "1";

        if (query.includes("2")) side = "2";

        selectedPrice = sizeData[side] || sizeData["1"];

        return {
          name: item.name,
          category: cat.name,
          size: selectedSize,
          side: side,
          price: selectedPrice
        };
      }
    }
  }

  return null;
};