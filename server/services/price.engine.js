const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../../database/price.db.json");

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

// ================= SEARCH =================
function findItem(msg) {
  const db = loadDB();
  msg = msg.toLowerCase();

  for (const cat of db.categories) {
    for (const item of cat.items) {
      if (msg.includes(item.name.toLowerCase())) {
        return item;
      }
    }
  }
  return null;
}

// ================= CALCULATE =================
function calculate(item, msg) {
  if (item.type === "fixed") {
    let out = `📄 ${item.name}\n\n`;
    for (let k in item.prices) {
      out += `${k}: ${item.prices[k]} Ks\n`;
    }
    return out;
  }

  if (item.type === "table") {
    let out = `📄 ${item.name}\n\n`;
    for (let size in item.prices) {
      const p = item.prices[size];
      out += `${size}:\n`;
      if (p["1"]) out += `1 Side: ${p["1"]} Ks\n`;
      if (p["2"]) out += `2 Side: ${p["2"]} Ks\n`;
      out += "\n";
    }
    return out;
  }

  if (item.type === "sqft") {
    const match = msg.match(/(\d+)\s*x\s*(\d+)/);
    if (!match) return "❌ Size မမှန်ပါ (ဥပမာ 3x4 ft)";

    const w = Number(match[1]);
    const h = Number(match[2]);
    const sqft = w * h;

    const price = sqft * item.price;

    return `📄 ${item.name}

Size: ${w} x ${h} ft
Area: ${sqft} sqft
Price: ${price} Ks`;
  }

  return "❌ Error";
}

module.exports = { findItem, calculate };