module.exports = function (parsed, price) {
  if (!price) return "❌ မတွေ့ပါ";

  return `💰 Price = ${price} Ks`;
};