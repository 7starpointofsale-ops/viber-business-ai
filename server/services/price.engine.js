const fs = require("fs");
const path = require("path");

let db = null;

const dbPath = path.join(__dirname, "../database/price.db.json");

function loadDB() {
  try {
    db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    console.log("✅ DB LOADED");
  } catch (err) {
    console.log("❌ DB ERROR:", err.message);
    db = { categories: [] };
  }
}

function getPrice(text = "") {
  if (!db) return null;

  const msg = text.toLowerCase();

  for (const cat of db.categories) {
    for (const item of cat.items) {
      if (msg.includes(item.name.toLowerCase())) {
        let out = `📄 ${item.name}\n\n`;

        for (const size in item.sizes) {
          out += `${size}:\n1 Side: ${item.sizes[size]["1"]} Ks\n2 Side: ${item.sizes[size]["2"] || "-"} Ks\n\n`;
        }

        return out;
      }
    }
  }

  return null;
}

module.exports = { loadDB, getPrice };