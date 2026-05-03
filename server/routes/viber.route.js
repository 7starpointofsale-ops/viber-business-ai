const express = require("express");
const router = express.Router();

const { handleMessage } = require("../controllers/bot.controller");

router.post("/", handleMessage);

module.exports = router;