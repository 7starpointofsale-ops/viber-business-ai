const priceTable = {
  "art paper 128g": { "1": 1400, "2": 2100, lamination: 1000 },
  "art paper 148g": { "1": 1600, "2": 2300, lamination: 1000 },

  "art card 210g": { "1": 1900, "2": 2500, lamination: 1000 },
  "art card 250g": { "1": 2200, "2": 2800, lamination: 1000 },
  "art card 300g": { "1": 2700, "2": 3800, lamination: 1000 },

  "white card 250g": { "1": 2900, "2": 4000, lamination: 1000 }
};

// simple memory storage (can upgrade to DB later)
const orders = [];

module.exports = { priceTable, orders };