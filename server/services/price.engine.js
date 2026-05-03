const fs = require("fs");
const path = require("path");

// 🔥 FIX: correct path (Render + local safe)
const dbPath =
  process.env.PRICE_DB_PATH ||
  path.join(__dirname, "../database/price.db.json");

// load db safely
let db = { categories: [] };

try {
  const raw = fs.readFileSync(dbPath, "utf-8");
  db = JSON.parse(raw);
} catch (err) {
  console.error("❌ PRICE DB LOAD ERROR:", err.message);
}

// ------------------------------
// CLEAN INPUT
// ------------------------------
function normalize(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u1000-\u109f\s\+\-]/gi, " ") // remove junk but keep Myanmar
    .replace(/\s+/g, " ")
    .trim();
}

// ------------------------------
// VALID INPUT CHECK
// ------------------------------
function isValidInput(text) {
  if (!text) return false;

  // reject pure math / junk
  if (/^\d+(\+\d+)+$/.test(text)) return false;
  if (/^[a-z0-9]{1,2}$/i.test(text)) return false;

  return true;
}

// ------------------------------
// STRICT MATCH SCORE
// ------------------------------
function scoreMatch(query, itemName) {
  const qWords = query.split(" ");
  const iWords = itemName.split(" ");

  let score = 0;

  qWords.forEach((q) => {
    if (iWords.includes(q)) score++;
  });

  return score;
}

// ------------------------------
// FIND ITEM
// ------------------------------
function findBestMatch(query) {
  const q = normalize(query);

  let best = null;
  let bestScore = 0;

  for (const cat of db.categories || []) {
    for (const item of cat.items || []) {
      const itemName = normalize(item.name);

      const score = scoreMatch(q, itemName);

      if (score > bestScore) {
        bestScore = score;
        best = { cat, item };
      }
    }
  }

  // 🔥 STRICT THRESHOLD (important)
  if (bestScore < 2) return null;

  return best;
}

// ------------------------------
// MAIN ENGINE
// ------------------------------
module.exports = function priceEngine(message = "") {
  const text = message.trim();

  // ❌ invalid input
  if (!isValidInput(text)) {
    return "❌ မတွေ့ပါ";
  }

  const found = findBestMatch(text);

  if (!found) {
    return "❌ မတွေ့ပါ";
  }

  const { cat, item } = found;

  // extract size if exists
  let sizeBlock = "";

  if (item.sizes) {
    Object.entries(item.sizes).forEach(([size, price]) => {
      sizeBlock += `
${size}:
1 Side: ${price["1"] || "-"} Ks
2 Side: ${price["2"] || "-"} Ks
`;
    });
  }

  return `📄 ${item.name}

${sizeBlock}`;
};