function getPrice(text) {
  if (text.includes("250")) {
    return "Art Card 250g: 1Side 1900Ks / 2Side 2500Ks";
  }
  return "Price not found";
}

module.exports = { getPrice };