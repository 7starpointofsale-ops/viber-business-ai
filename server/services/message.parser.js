module.exports = function (text) {
  text = text.toLowerCase();

  let item = null;
  let size = null;
  let side = "1";

  if (text.includes("250")) item = "Art Card 250g";
  if (text.includes("300")) item = "Art Card 300g";

  if (text.includes("a4")) size = "a4";
  if (text.includes("13x19")) size = "13x19";

  if (text.includes("2") || text.includes("double")) side = "2";

  return { item, size, side };
};