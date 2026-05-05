function calculatePrice(item, input) {
  let total = 0;

  if (item.type === "fixed") {
    total = item.price * (input.qty || 1);
  }

  if (item.type === "sqft") {
    const size = input.size || "1x1";
    const [w, h] = size.split("x").map(Number);
    total = w * h * item.price;
  }

  // urgent
  if (input.urgent) {
    total *= 1.3;
  }

  return Math.round(total);
}

module.exports = { calculatePrice };