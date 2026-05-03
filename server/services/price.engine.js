const db = require("../../database/price.db.json");

module.exports = function ({ item, size, side }) {
  for (let cat of db.categories) {
    for (let i of cat.items) {
      if (i.name === item) {
        if (i.sizes[size]) {
          return i.sizes[size][side];
        }
      }
    }
  }
  return null;
};