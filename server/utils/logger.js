function logOrder(order, action) {
  const time = new Date().toISOString();
  order.history.push({
    action,
    time
  });
}

module.exports = { logOrder };