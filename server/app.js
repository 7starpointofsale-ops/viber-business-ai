const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../database/price.db.json");

let priceDB = null;

// ---------- LOAD DB ----------
function loadDB() {
  try {
    const raw = fs.readFileSync(dbPath, "utf-8");
    priceDB = JSON.parse(raw);
    console.log("✅ PRICE DB LOADED");
  } catch (err) {
    console.error("❌ PRICE DB ERROR:", err.message);
    priceDB = null;
  }
}

// ---------- NORMALIZE ----------
function normalize(t = "") {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9\u1000-\u109f\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- SMART FIND (FIXED) ----------
function findBest(input) {
  if (!priceDB) return null;

  const q = normalize(input);

  let best = null;

  for (const cat of priceDB.categories) {
    for (const item of cat.items) {
      const name = normalize(item.name);

      // 🔥 STRONG MATCH
      if (q.includes(name)) {
        return { cat, item };
      }

      // 🔥 PARTIAL SCORE MATCH
      const words = name.split(" ");
      let score = 0;

      for (const w of words) {
        if (q.includes(w)) score++;
      }

      if (!best || score > best.score) {
        best = { cat, item, score };
      }
    }
  }

  if (best && best.score >= 1) {
    return best;
  }

  return null;
}

// ---------- MAIN CALCULATE ----------
function calculate(input) {
  const match = findBest(input);

  if (!match) {
    return "❌ မတွေ့ပါ";
  }

  const { item } = match;
  const q = normalize(input);

  // size detect
  const sizes = Object.keys(item.sizes);

  let selectedSize = sizes.find(s => q.includes(normalize(s)));

  if (!selectedSize) selectedSize = sizes[0];

  const sizeData = item.sizes[selectedSize];

  if (!sizeData) {
    return `❌ Size မတွေ့ပါ (${item.name})`;
  }

  // side detect
  let side = "1";

  if (q.includes("2 side")) side = "2";
  if (q.includes("1 side")) side = "1";

  const price = sizeData[side] || sizeData["1"];

  return `📄 ${item.name}

${selectedSize}
${side} Side: ${price} Ks`;
}

module.exports = {
  loadDB,
  calculate
};