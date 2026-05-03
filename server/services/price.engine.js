const fs = require("fs");
const path = require("path");

// ✅ Render + Local safe path
const dbPath = path.join(process.cwd(), "database", "price.db.json");

// ------------------------
// LOAD DATABASE SAFELY
// ------------------------
let db = { categories: [] };

try {
  if (fs.existsSync(dbPath)) {
    const raw = fs.readFileSync(dbPath, "utf-8");
    db = JSON.parse(raw);
  } else {
    console.error("❌ PRICE DB FILE NOT FOUND:", dbPath);
  }
} catch (err) {
  console.error("❌ PRICE DB ERROR:", err.message);
}

// ------------------------
// NORMALIZE TEXT (important fix)
// ------------------------
function normalize(text = "") {
  return text
    .toLowerCase()
    .replace(/g|pcs|pcs\.|a4|a3|a5/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ------------------------
// PRICE SEARCH ENGINE
// ------------------------
function findPrice(text = "") {
  try {
    const msg = normalize(text);

    if (!db?.categories || !Array.isArray(db.categories)) {
      return "❌ Database error";
    }

    for (const cat of db.categories) {
      for (const item of cat.items) {
        const itemName = normalize(item.name);

        // ✅ SMART MATCH (fix for partial input)
        if (
          msg.includes(itemName) ||
          itemName.includes(msg) ||
          similarity(msg, itemName)
        ) {
          let reply = `📄 ${item.name}\n\n`;

          for (const size in item.sizes) {
            const s = item.sizes[size];

            reply += `${size}:\n`;
            reply += `1 Side: ${s["1"] ?? "-"} Ks\n`;
            reply += `2 Side: ${s["2"] ?? "-"} Ks\n\n`;
          }

          return reply.trim();
        }
      }
    }

    return "❌ မတွေ့ပါ";
  } catch (e) {
    console.error("ENGINE ERROR:", e);
    return "❌ system error";
  }
}

// ------------------------
// SIMPLE SIMILARITY MATCH
// (lightweight fuzzy match)
// ------------------------
function similarity(a, b) {
  if (!a || !b) return false;

  const aWords = a.split(" ");
  const bWords = b.split(" ");

  let match = 0;

  for (const w of aWords) {
    if (bWords.some(x => x.includes(w))) {
      match++;
    }
  }

  return match >= Math.min(2, aWords.length);
}

module.exports = findPrice;