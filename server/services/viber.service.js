const axios = require("axios");

const TOKEN = process.env.VIBER_TOKEN;

exports.send = async (userId, text) => {
  try {
    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver: userId,
        min_api_version: 1,
        sender: {
          name: "7 Star Sayar Gyi"
        },
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
  } catch (err) {
    console.error("VIBER SEND ERROR:", err.message);
  }
};