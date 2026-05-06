function clean(msg) {
  return (msg || "")
    .replace(/[📁📄💰🧮📦]/g, "")
    .replace(/\u200B/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

module.exports = { clean };