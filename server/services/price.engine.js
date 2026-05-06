const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../../database/price.db.json");

// =======================
// LOAD DB
function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

// =======================
// NORMALIZE (Myanmar + typo fix)
function normalize(msg = "") {
  return msg
    .toLowerCase()
    .replace(/၁/g, "1")
    .replace(/၂/g, "2")
    .replace(/၃/g, "3")
    .replace(/၄/g, "4")
    .replace(/၅/g, "5")
    .replace(/၆/g, "6")
    .replace(/၇/g, "7")
    .replace(/၈/g, "8")
    .replace(/၉/g, "9")
    .replace(/၀/g, "0")
    .replace(/\*/g, "x")
    .replace(/\s+/g, " ");
}

// =======================
// FIND ITEM (SAFE + OLD SUPPORT)
function findItem(msg) {
  const db = loadDB();
  msg = normalize(msg);

  let found = null;

  db.categories.forEach(c => {
    c.items.forEach(i => {

      const name = (i.item || i.name || "").toLowerCase();

      if (
        msg.includes(name) ||
        name.includes(msg.split(" ")[0])
      ) {
        found = {
          item: i.item || i.name,
          s1: i.s1 || i.price || 0,
          s2: i.s2 || i.price2 || 0
        };
      }

    });
  });

  return found;
}

// =======================
// SIZE EXTRACT
function extractSize(msg) {
  msg = normalize(msg);

  const m = msg.match(/(\d+)\s*[x*]\s*(\d+)/);
  if (!m) return null;

  return {
    w: Number(m[1]),
    h: Number(m[2])
  };
}

// =======================
// QTY (1 / ၁ support)
function extractQty(msg) {
  msg = normalize(msg);
  const m = msg.match(/(\d+)/);
  return m ? Number(m[1]) : 1;
}

// =======================
// MAIN PARSER (SAFE)
function parseMessage(msg) {
  msg = normalize(msg);

  const item = findItem(msg);
  const size = extractSize(msg);
  const qty = extractQty(msg);

  return {
    item,
    size,
    qty
  };
}

module.exports = { parseMessage };