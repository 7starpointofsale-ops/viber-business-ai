const parseMessage = require("../services/message.parser");
const getPrice = require("../services/price.engine");
const buildReply = require("../services/reply.builder");
const sendMessage = require("../services/viber.service");

exports.handleMessage = async (req, res) => {
  const body = req.body;

  if (body.event !== "message") {
    return res.sendStatus(200);
  }

  const userText = body.message.text;
  const senderId = body.sender.id;

  console.log("📩 Incoming:", userText);

  const parsed = parseMessage(userText);
  const price = getPrice(parsed);
  const reply = buildReply(parsed, price);

  await sendMessage(senderId, reply);

  res.sendStatus(200);
};