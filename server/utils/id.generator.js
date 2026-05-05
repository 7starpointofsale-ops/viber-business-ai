function generateOrderId() {
  const ts = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 1000);
  return `ORD-${ts}${rand}`;
}

module.exports = { generateOrderId };