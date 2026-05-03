const fs = require("fs");
const path = require("path");

// ----------------------
// DB PATH FIX (Render safe)
// ----------------------
const dbPath =
  process.env.PRICE_DB_PATH ||
  path.join(__dirname, "../database/price.db.json");

// ----------------------
// LOAD DB SAFE
// ----------------------
let db = { categories: [] };

try {
  const raw = fs.readFileSync(dbPath, "utf-8");
  db = JSON.parse(raw);
} catch (err) {
  console.error("❌ PRICE DB LOAD ERROR:", err.message);
}

// ----------------------
// NORMALIZE TEXT
// ----------------------
function normalize(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u1000-\u109f\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ----------------------
// VALID INPUT CHECK
// ----------------------
function isValid(text) {
  if (!text) return false;

  // reject junk like 12345 / 5+10 / abc only
  if (/^\d+$/.test(text)) return false;
  if (/^\d+(\+\d+)+$/.test(text)) return false;
  if (text.length < 2) return false;

  return true;
}

// ----------------------
// MATCH FUNCTION
// ----------------------
function findMatch(query) {
  const q = normalize(query);

  let best = null;
  let bestScore = 0;

  for (const cat of db.categories || []) {
    for (const item of cat.items || []) {
      const itemName = normalize(item.name);

      let score = 0;

      const qWords = q.split(" ");
      const iWords = itemName.split(" ");

      qWords.forEach(w => {
        if (iWords.includes(w)) score++;
      });

      if (score > bestScore) {
        bestScore = score;
        best = { cat, item };
      }
    }
  }

  // 🔥 STRICT RULE (avoid wrong fallback like A4)
  if (!best || bestScore < 2) return null;

  return best;
}

// ----------------------
// MAIN EXPORT
// ----------------------
module.exports = function priceEngine(message = "") {
  const input = message.trim();

  // ❌ invalid input
  if (!isValid(input)) {
    return "❌ မတွေ့ပါ";
  }

  const match = findMatch(input);

  // ❌ no match
  if (!match) {
    return "❌ မတွေ့ပါ";
  }

  const { item } = match;

  let output = `📄 ${item.name}\n\n`;

  if (item.sizes) {
    for (const [size, price] of Object.entries(item.sizes)) {
      output += `${size}:\n1 Side: ${price["1"] || "-"} Ks\n2 Side: ${price["2"] || "-"} Ks\n\n`;
    }
  }

  return output.trim();
};