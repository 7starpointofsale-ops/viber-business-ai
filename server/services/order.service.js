const fs = require("fs");
const path = require("path");
const { generateOrderId } = require("../utils/id.generator");
const { logOrder } = require("../utils/logger");

const ORDER_DB = path.join(__dirname, "../../database/orders.db.json");

function readDB() {
  if (!fs.existsSync(ORDER_DB)) {
    fs.writeFileSync(ORDER_DB, JSON.stringify({ orders: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(ORDER_DB));
}

function writeDB(data) {
  fs.writeFileSync(ORDER_DB, JSON.stringify(data, null, 2));
}

function createOrder(data) {
  const db = readDB();

  const order = {
    id: generateOrderId(),
    customer: data.customer || "Unknown",
    phone: data.phone || "",
    service: data.service,
    qty: data.qty || 1,
    price: data.price,
    status: "NEW",
    staff: null,
    created_at: new Date().toISOString(),
    history: []
  };

  logOrder(order, "CREATED");

  db.orders.push(order);
  writeDB(db);

  return order;
}

module.exports = { createOrder };