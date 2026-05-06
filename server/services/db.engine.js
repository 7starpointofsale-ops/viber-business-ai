const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../database/price.db.json");

let cache = null;

function loadDB() {
  if (!cache) {
    cache = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  }
  return cache;
}

function refreshDB() {
  try {
    cache = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {}
}

setInterval(refreshDB, 10000);

module.exports = { loadDB };