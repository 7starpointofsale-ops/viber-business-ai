const fs = require("fs");
const path = require("path");

// FIXED PATH (IMPORTANT)
const dbPath = path.join(__dirname, "../database/price.db.json");

let DB = null;

// LOAD DB
function loadDB() {
  try {
    const raw = fs.readFileSync(dbPath, "utf-8");
    DB = JSON.parse(raw);
    console.log("✅ PRICE DB LOADED");
  } catch (err) {
    console.error("❌ PRICE DB LOAD ERROR:", err.message);
    DB = { categories: [] };
  }
}

// normalize text
function norm(text = "") {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

// smart find item
function findItem(msg) {
  const input = norm(msg);

  if (!DB || !DB.categories) return null;

  for (const cat of DB.categories) {
    for (const item of cat.items) {
      const itemName = norm(item.name);

      if (input.includes(itemName)) {
        return { cat, item };
      }
    }
  }
  return null;
}

// MAIN ENGINE
function getPrice(message) {
  const match = findItem(message);

  if (!match) {
    return "❌ မတွေ့ပါ";
  }

  const { cat, item } = match;

  let sizeKey = null;
  let side = null;

  if (message.includes("a4")) sizeKey = "A4";
  if (message.includes("13x19")) sizeKey = "13x19";
  if (message.includes("legal")) sizeKey = "Legal";
  if (message.includes("standard")) sizeKey = "Standard";

  if (message.includes("1 side")) side = "1";
  if (message.includes("2 side")) side = "2";

  let result = `📄 ${item.name}\n\n`;

  for (const s in item.sizes) {
    result += `${s}:\n`;
    for (const k in item.sizes[s]) {
      result += `${k} Side: ${item.sizes[s][k]} Ks\n`;
    }
    result += `\n`;
  }

  return result;
}

module.exports = {
  loadDB,
  getPrice
};