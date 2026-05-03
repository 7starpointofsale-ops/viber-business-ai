const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

// =======================
// 🔥 MIDDLEWARE
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =======================
// 📁 STATIC FILES
// =======================

// Admin panel
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// Optional: public folder (if you have frontend)
app.use(express.static(path.join(__dirname, "../public")));

// =======================
// 📦 PRICE DB SAFE LOADER (GLOBAL CHECK)
// =======================
function loadPriceDB() {
  try {
    const filePath = path.join(__dirname, "../price.db.json");

    if (!fs.existsSync(filePath)) {
      console.log("❌ price.db.json NOT FOUND at root");
      return { categories: [] };
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(raw);

    if (!Array.isArray(json.categories)) {
      console.log("❌ categories invalid format");
      return { categories: [] };
    }

    return json;
  } catch (err) {
    console.log("❌ PRICE DB LOAD ERROR:", err.message);
    return { categories: [] };
  }
}

// =======================
// 📡 API ROUTES
// =======================

// GET PRICE DATA
app.get("/api/prices", (req, res) => {
  const db = loadPriceDB();
  res.json(db);
});

// =======================
// 🧪 SIMPLE HEALTH CHECK
// =======================
app.get("/", (req, res) => {
  res.send("🚀 Viber Business AI Bot Running...");
});

// =======================
// 🚀 START SERVER (Render Safe)
// =======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});