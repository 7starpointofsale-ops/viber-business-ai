const fs = require("fs");
const path = require("path");
const { calculate } = require("./price.engine");

// 🧾 temporary order memory (later DB ချိတ်လို့ရ)
let orders = [];

// ---------- CREATE ORDER ----------
function createOrder(input, userId = "guest") {
  const priceText = calculate(input);

  if (priceText.includes("❌")) {
    return {
      success: false,
      message: "❌ Item မတွေ့ပါ"
    };
  }

  // extract price number
  const priceMatch = priceText.match(/(\d+)\s*Ks/);
  const price = priceMatch ? parseInt(priceMatch[1]) : 0;

  const order = {
    id: Date.now(),
    userId,
    input,
    price,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  orders.push(order);

  return {
    success: true,
    order,
    message: `🧾 Order Created\nOrder ID: ${order.id}\nPrice: ${price} Ks`
  };
}

// ---------- GET ORDER ----------
function getOrder(id) {
  return orders.find(o => o.id == id);
}

// ---------- LIST ORDERS ----------
function listOrders() {
  return orders;
}

// ---------- GENERATE INVOICE ----------
function generateInvoice(orderId) {
  const order = getOrder(orderId);

  if (!order) {
    return "❌ Order မတွေ့ပါ";
  }

  return `
🧾 INVOICE

Order ID: ${order.id}
Item: ${order.input}

💰 Total: ${order.price} Ks

Status: ${order.status}
Date: ${order.createdAt}
  `.trim();
}

module.exports = {
  createOrder,
  getOrder,
  listOrders,
  generateInvoice
};