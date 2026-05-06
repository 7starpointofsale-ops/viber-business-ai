const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../../database/price.db.json");

// =======================
// LOAD DB
// =======================
function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

// =======================
// FIND ITEM
// =======================
function findItem(msg) {
  const db = loadDB();

  let found = null;
  let categoryFound = null;

  db.categories.forEach(c => {
    c.items.forEach(i => {
      if (
        msg.includes(i.item.toLowerCase()) ||
        msg.includes(c.name.toLowerCase())
      ) {
        found = i;
        categoryFound = c.name;
      }
    });
  });

  return { found, categoryFound };
}

// =======================
// EXTRACT SIZE
// =======================
function extractSize(msg) {
  const m = msg.match(/(\d+)\s*[x*]\s*(\d+)/);
  if (!m) return null;

  return {
    w: Number(m[1]),
    h: Number(m[2]),
    area: Number(m[1]) * Number(m[2])
  };
}

// =======================
// EXTRACT QTY
// =======================
function extractQty(msg) {
  const m = msg.match(/(\d+)\s*(pcs|pc|unit)?/);
  return m ? Number(m[1]) : 1;
}

// =======================
// CALCULATE PRICE
// =======================
function calculate(item, size, qty) {
  if (!item) return null;

  // direct match price table
  if (item.s1) {
    return item.s1 * qty;
  }

  return null;
}

// =======================
// MAIN PARSER
// =======================
function parseMessage(msg) {
  msg = msg.toLowerCase();

  const { found } = findItem(msg);
  const size = extractSize(msg);
  const qty = extractQty(msg);

  return {
    item: found,
    size,
    qty,
    price: calculate(found, size, qty)
  };
}

module.exports = {
  parseMessage
};