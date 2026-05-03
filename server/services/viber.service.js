const axios = require("axios");

module.exports = async function (receiver, text) {
  await axios.post(
    "https://chatapi.viber.com/pa/send_message",
    {
      receiver,
      type: "text",
      text
    },
    {
      headers: {
        "X-Viber-Auth-Token": process.env.VIBER_TOKEN
      }
    }
  );
};