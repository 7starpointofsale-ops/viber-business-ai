
// ==========================
// 🤖 GREETING
// ==========================
exports.greet = () => {
  return `Hello 👋 7Star Printing AI မှကြိုဆိုပါတယ်

သင်လိုအပ်တာကိုရေးပေးပါ👇
- price (ဥပမာ: art card 250)
- order
- service name`;
};

// ==========================
// 📦 ORDER GUIDE
// ==========================
exports.orderGuide = () => {
  return `📦 Order လုပ်ရန်:
1️⃣ Item name
2️⃣ Size (A4 / 13x19 / etc)
3️⃣ Quantity
4️⃣ Phone number

ပြီးရင် confirm ပေးပါ။`;
};

// ==========================
// 💰 PRICE RESULT
// ==========================
exports.price = (data) => {
  if (!data) return this.notFound();

  return `📄 ${data.name}

📂 Category: ${data.category}
📏 Size: ${data.size}
🔢 Side: ${data.side}

💰 Price: ${data.price} Ks

👉 လိုအပ်ရင် order လုပ်နိုင်ပါတယ်`;
};

// ==========================
// ❌ NOT FOUND
// ==========================
exports.notFound = () => {
  return `❌ မတွေ့ပါ

👉 မှန်ကန်တဲ့ product name ရိုက်ပေးပါ
ဥပမာ:
- art card 250
- flyer a4
- pvc card`;
};

// ==========================
// ⚠️ UNKNOWN / FALLBACK
// ==========================
exports.defaultReply = () => {
  return `Hello 👋 7Star Printing AI

👉 သင်ဘာလိုချင်တာလဲ?
- Price စစ်မလား?
- Order လုပ်မလား?

ရေးပေးပါ 😊`;
};