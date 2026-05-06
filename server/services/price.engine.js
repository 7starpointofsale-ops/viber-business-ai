const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../../database/price.db.json");

// =======================
// LOAD DB (SAFE)
function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch (e) {
    return { categories: [] };
  }
}

// =======================
// NORMALIZE
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
// FIND ITEM (ROBUST)
function findItem(msg) {
  const db = loadDB();
  msg = normalize(msg);

  for (const c of db.categories) {
    for (const i of c.items) {
      const name = (i.item || "").toLowerCase();

      if (msg.includes(name)) {
        return {
          item: i.item,
          s1: Number(i.s1 || 0),
          s2: Number(i.s2 || 0),
          size: i.size,
          gsm: i.gsm
        };
      }
    }
  }

  return null;
}

// =======================
// SIZE EXTRACT
function extractSize(msg) {
  const m = msg.match(/(\d+)\s*[x*]\s*(\d+)/);
  if (!m) return null;

  return {
    w: Number(m[1]),
    h: Number(m[2])
  };
}

// =======================
// QTY
function extractQty(msg) {
  const m = msg.match(/(\d+)/);
  return m ? Number(m[1]) : 1;
}

// =======================

function parseMessage(msg) {
  return {
    item: findItem(msg),
    size: extractSize(msg),
    qty: extractQty(msg)
  };
}

module.exports = {
  loadDB,
  findItem,
  parseMessage
};