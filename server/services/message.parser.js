const normalize = (text) => {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
};

exports.detect = (text) => {
  if (!text) return { type: "unknown" };

  const raw = text;
  const msg = normalize(text);

  // ==========================
  // 👋 GREETINGS (SMART MATCH)
  // ==========================
  const greetings = [
    "hi",
    "hello",
    "hey",
    "helo",
    "hii",
    "hai",
    "ဟိုင်း",
    "မင်္ဂလာပါ"
  ];

  if (greetings.some(g => msg.includes(normalize(g)))) {
    return { type: "greet" };
  }

  // ==========================
  // 📦 ORDER DETECTION
  // ==========================
  if (msg.includes("order") || msg.includes("မှာချင်") || msg.includes("မှာမယ်")) {
    return { type: "order" };
  }

  // ==========================
  // 💰 PRICE REQUEST DETECTION
  // ==========================
  const priceKeywords = [
    "price",
    "ဈေး",
    "တွက်",
    "cost",
    "ဘယ်လောက်"
  ];

  if (priceKeywords.some(k => msg.includes(normalize(k))) || true) {
    // fallback: everything goes to price engine (safe)
    return {
      type: "price",
      query: raw
    };
  }

  return { type: "unknown", query: raw };
};