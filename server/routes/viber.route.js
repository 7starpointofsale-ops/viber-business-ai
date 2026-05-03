const express = require("express");
const router = express.Router();
const botController = require("../controllers/bot.controller");

router.post("/", botController.handleMessage);

module.exports = router;