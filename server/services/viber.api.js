const axios = require("axios");

async function send(userId, text, keyboard = null) {
  const body = {
    receiver: userId,
    type: "text",
    text
  };

  if (keyboard) body.keyboard = keyboard;

  await axios.post(
    "https://chatapi.viber.com/pa/send_message",
    body,
    {
      headers: {
        "X-Viber-Auth-Token": process.env.VIBER_TOKEN
      }
    }
  ).catch(() => {});
}

module.exports = { send };