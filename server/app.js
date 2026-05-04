function normalize(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function handleMessage(text = "") {
  const msg = normalize(text);

  if (msg === "hi" || msg === "hello" || msg === "မင်္ဂလာပါ") {
    return "Hello 👋 7Star Printing AI မှကြိုဆိုပါတယ်";
  }

  const db = loadDB();

  let bestMatch = null;

  for (const cat of db.categories) {
    for (const item of cat.items) {

      const itemName = normalize(item.name);

      // 🔥 fuzzy match (important)
      if (msg.includes(itemName) || itemName.includes(msg)) {
        bestMatch = item;
        break;
      }

      // 🔥 keyword split match
      const words = itemName.split(" ");
      let score = 0;

      words.forEach(w => {
        if (msg.includes(w)) score++;
      });

      if (score >= 2) { // threshold
        bestMatch = item;
        break;
      }
    }
  }

  if (!bestMatch) {
    return "❌ Item မတွေ့ပါ";
  }

  let reply = `📄 ${bestMatch.name}\n\n`;

  for (const key in bestMatch.prices) {
    const val = bestMatch.prices[key];

    if (typeof val === "object") {
      reply += `${key}:\n`;
      if (val["1"]) reply += `1 Side: ${val["1"]} Ks\n`;
      if (val["2"]) reply += `2 Side: ${val["2"]} Ks\n`;
      reply += "\n";
    } else {
      reply += `${key}: ${val} Ks\n`;
    }
  }

  return reply;
}