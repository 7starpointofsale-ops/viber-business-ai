const axios = require("axios");

const TOKEN = process.env.VIBER_TOKEN;

async function sendMessage(receiver, text) {
  try {
    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver,
        type: "text",
        text
      },
      {
        headers: {
          "X-Viber-Auth-Token": TOKEN,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (err) {
    console.log("Viber error:", err.message);
  }
}

module.exports = { sendMessage };