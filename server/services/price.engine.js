@"
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../../database/price.db.json");

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function findItem(msg) {
  const db = loadDB();
  msg = msg.toLowerCase();

  for (const cat of db.categories) {
    for (const item of cat.items) {
      const name = item.name.toLowerCase();

      if (
        msg.includes(name) ||
        name.split(" ").some(w => msg.includes(w))
      ) {
        return item;
      }
    }
  }
  return null;
}

function calculate(item, msg) {
  if (item.type === "sqft") {
    const match = msg.match(/(\d+)\s*x\s*(\d+)/);
    if (!match) return "❌ Size မမှန်ပါ";

    const w = Number(match[1]);
    const h = Number(match[2]);
    const sqft = w * h;
    const price = sqft * item.price;

    return `📄 ${item.name}
Size: ${w}x${h} ft
Area: ${sqft} sqft
Price: ${price} Ks`;
  }

  let out = `📄 ${item.name}\n\n`;

  for (let k in item.prices) {
    const v = item.prices[k];

    if (typeof v === "object") {
      out += `${k}:\n`;
      if (v["1"]) out += `1 Side: ${v["1"]} Ks\n`;
      if (v["2"]) out += `2 Side: ${v["2"]} Ks\n`;
      out += "\n";
    } else {
      out += `${k}: ${v} Ks\n`;
    }
  }

  return out;
}

module.exports = { findItem, calculate };
"@ | Out-File -Encoding utf8 server\services\price.engine.js