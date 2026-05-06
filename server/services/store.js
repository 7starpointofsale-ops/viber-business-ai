const fs = require("fs");
const path = require("path");

const ORDER_DB = path.join(__dirname, "../../database/orders.db.json");

function readOrders() {
  if (!fs.existsSync(ORDER_DB)) {
    fs.writeFileSync(ORDER_DB, JSON.stringify({ orders: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(ORDER_DB));
}

function saveOrders(data) {
  fs.writeFileSync(ORDER_DB, JSON.stringify(data, null, 2));
}

module.exports = { readOrders, saveOrders };