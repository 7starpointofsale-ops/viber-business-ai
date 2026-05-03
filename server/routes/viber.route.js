const express = require("express");
const router = express.Router();
const botController = require("../controllers/bot.controller");

// Viber webhook
router.post("/", botController.handleMessage);

module.exports = router;