const fs = require("fs");
const path = require("path");

// ✅ FIXED: correct DB path (Render + local both work)
const dbPath = path.join(__dirname, "../database/price.db.json");

let priceDB = null;

// ---------- LOAD DB ----------
function loadDB() {
  try {
    const raw = fs.readFileSync(dbPath, "utf-8");
    priceDB = JSON.parse(raw);
    console.log("✅ PRICE DB LOADED");
  } catch (err) {
    console.error("❌ PRICE DB LOAD ERROR:", err.message);
    priceDB = null;
  }
}

// ---------- NORMALIZE TEXT ----------
function normalize(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u1000-\u109f\s]/g, " ") // English + Myanmar support
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- FIND BEST MATCH ----------
function findMatch(input) {
  if (!priceDB) return null;

  const q = normalize(input);

  let best = null;

  for (const cat of priceDB.categories) {
    for (const item of cat.items) {
      const itemName = normalize(item.name);

      // strict includes match first
      if (q.includes(itemName)) {
        return { cat, item };
      }

      // fuzzy partial scoring
      const words = itemName.split(" ");
      let score = 0;

      for (const w of words) {
        if (q.includes(w)) score++;
      }

      if (!best || score > best.score) {
        best = { cat, item, score };
      }
    }
  }

  // minimum threshold
  if (best && best.score >= 1) {
    return best;
  }

  return null;
}

// ---------- CALCULATE PRICE ----------
function calculate(input) {
  const match = findMatch(input);

  if (!match) {
    return "❌ မတွေ့ပါ";
  }

  const { item } = match;

  // extract size (A4, 13x19, etc.)
  const sizeKeys = Object.keys(item.sizes);

  let selectedSize = sizeKeys.find(s =>
    normalize(input).includes(normalize(s))
  );

  if (!selectedSize) {
    selectedSize = sizeKeys[0]; // fallback first size
  }

  const sizeData = item.sizes[selectedSize];

  if (!sizeData) {
    return `❌ Size မတွေ့ပါ (${item.name})`;
  }

  // detect side
  const inputLower = input.toLowerCase();

  let side = "1";

  if (inputLower.includes("2 side") || inputLower.includes("2side")) {
    side = "2";
  }

  if (inputLower.includes("1 side") || inputLower.includes("1side")) {
    side = "1";
  }

  const price = sizeData[side] || sizeData["1"];

  return `📄 ${item.name}\n\n${selectedSize}:\n${side} Side: ${price} Ks`;
}

module.exports = {
  loadDB,
  calculate
};