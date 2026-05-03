const axios = require("axios");

const TOKEN = process.env.VIBER_TOKEN;

async function sendMessage(receiver, text) {
  try {
    const response = await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver: receiver,
        type: "text",
        text: text
      },
      {
        headers: {
          "X-Viber-Auth-Token": TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;
  } catch (err) {
    console.log("❌ Viber send error:", err.message);
  }
}

module.exports = { sendMessage };