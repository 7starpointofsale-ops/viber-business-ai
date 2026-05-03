const fs = require("fs");
const path = require("path");

// ✅ FIXED DB PATH
const DB_PATH = path.join(__dirname, "../../database/price.db.json");

let db = { categories: [] };

try {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  db = JSON.parse(raw);
  console.log("✅ PRICE DB LOADED");
} catch (err) {
  console.log("❌ PRICE DB LOAD ERROR:", err.message);
}

/* -------------------------------
   🧠 TEXT NORMALIZE (IMPORTANT)
--------------------------------*/
function normalize(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u1000-\u109f\s]/g, " ") // keep burmese + numbers
    .replace(/\s+/g, " ")
    .trim();
}

/* -------------------------------
   🔍 EXTRACT INFO
--------------------------------*/
function extractNumber(text) {
  const match = text.match(/\d+/);
  return match ? match[0] : null;
}

function detectSide(text) {
  if (text.includes("2")) return 2;
  if (text.includes("one") || text.includes("1")) return 1;
  return null;
}

/* -------------------------------
   🧠 SMART MATCH ENGINE
--------------------------------*/
function findBestMatch(text) {
  const msg = normalize(text);
  const num = extractNumber(msg);

  let best = null;
  let bestScore = 0;

  for (const cat of db.categories) {
    for (const item of cat.items) {
      const itemName = normalize(item.name);

      let score = 0;

      // 🔥 name match
      if (msg.includes(itemName)) score += 5;

      // 🔥 partial keyword match
      const words = itemName.split(" ");
      for (let w of words) {
        if (w && msg.includes(w)) score += 1;
      }

      // 🔥 number match (250g etc)
      if (num && itemName.includes(num)) score += 3;

      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
  }

  return bestScore >= 3 ? best : null;
}

/* -------------------------------
   💬 RESPONSE FORMATTER
--------------------------------*/
function formatReply(item) {
  if (!item) return "❌ မတွေ့ပါ";

  let reply = `📄 ${item.name}\n\n`;

  for (const size in item.sizes) {
    reply += `${size}:\n`;
    reply += `1 Side: ${item.sizes[size]["1"]} Ks\n`;

    if (item.sizes[size]["2"]) {
      reply += `2 Side: ${item.sizes[size]["2"]} Ks\n`;
    }

    reply += `\n`;
  }

  return reply;
}

/* -------------------------------
   🚀 MAIN EXPORT
--------------------------------*/
module.exports = function (msg) {
  const text = msg.trim();

  // 🧮 simple math support
  if (/^\d+\s*[\+\-\*\/]\s*\d+$/.test(text)) {
    try {
      return "🧮 Result: " + eval(text);
    } catch {
      return "❌ မတွက်နိုင်ပါ";
    }
  }

  const result = findBestMatch(text);

  return formatReply(result);
};