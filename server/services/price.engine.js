const fs = require("fs");
const path = require("path");

// ✅ FIXED PATH (ONLY ONE)
const dbPath = path.join(__dirname, "../../database/price.db.json");

function loadDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      console.error("❌ PRICE DB FILE NOT FOUND:", dbPath);
      return { categories: [] };
    }

    return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  } catch (err) {
    console.error("❌ DB ERROR:", err);
    return { categories: [] };
  }
}

// normalize text
function norm(t) {
  return t.toLowerCase().replace(/\s+/g, " ").trim();
}

// math engine
function isMath(text) {
  return /^[0-9+\-*/().\s]+$/.test(text);
}

function calc(text) {
  try {
    return eval(text);
  } catch {
    return null;
  }
}

module.exports = function (msg) {
  const input = norm(msg);

  // 🧮 math first
  if (isMath(input)) {
    const result = calc(input);
    if (result !== null) return `🧮 Result: ${result}`;
  }

  const db = loadDB();

  for (const cat of db.categories || []) {
    for (const item of cat.items || []) {
      const itemName = norm(item.name);

      if (input.includes(itemName)) {
        let out = `📄 ${item.name}\n\n`;

        for (const size in item.sizes) {
          const p = item.sizes[size];
          out += `${size}:\n`;
          if (p["1"]) out += `1 Side: ${p["1"]} Ks\n`;
          if (p["2"]) out += `2 Side: ${p["2"]} Ks\n`;
          out += `\n`;
        }

        return out;
      }
    }
  }

  return "❌ မတွေ့ပါ";
};