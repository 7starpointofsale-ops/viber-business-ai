const parser = require("../services/message.parser");
const priceEngine = require("../services/price.engine");
const replyBuilder = require("../services/reply.builder");
const viberService = require("../services/viber.service");

let cache = new Map();

exports.handleMessage = async (req, res) => {
  try {
    const message = req.body.message;
    const sender = req.body.sender;

    if (!message || !sender) return res.sendStatus(200);

    const userId = sender.id;
    const text = message.text || "";

    // ==========================
    // 🔥 ANTI DUPLICATE SYSTEM
    // ==========================
    const key = userId + text;
    if (cache.has(key)) return res.sendStatus(200);

    cache.set(key, true);
    setTimeout(() => cache.delete(key), 4000);

    // ==========================
    // 🧠 PARSE MESSAGE
    // ==========================
    const parsed = parser.detect(text);

    let response;

    switch (parsed.type) {

      case "greet":
        response = replyBuilder.greet();
        break;

      case "order":
        response = replyBuilder.orderGuide();
        break;

      case "price":
        const result = priceEngine.find(parsed.query);

        if (!result) {
          response = replyBuilder.notFound();
        } else {
          response = replyBuilder.price(result);
        }
        break;

      default:
        response = replyBuilder.defaultReply();
    }

    // ==========================
    // 📤 SEND RESPONSE
    // ==========================
    await viberService.send(userId, response);

    res.sendStatus(200);

  } catch (err) {
    console.error("BOT ERROR:", err);
    res.sendStatus(200);
  }
};