function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, "");
}

function match(input, name) {
  return normalize(input).includes(normalize(name));
}

module.exports = { match };