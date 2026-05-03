const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../../database/price.db.json");

function getDB() {
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function findPrice(text) {
  const db = getDB();

  if (text.includes("250")) {
    const p = db.art_card_250;
    return `${p.name}\n1 Side: ${p["1side"]} Ks\n2 Side: ${p["2side"]} Ks`;
  }

  if (text.includes("300")) {
    const p = db.art_card_300;
    return `${p.name}\n1 Side: ${p["1side"]} Ks\n2 Side: ${p["2side"]} Ks`;
  }

  return null;
}

module.exports = { findPrice };