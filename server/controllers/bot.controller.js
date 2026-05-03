exports.handleMessage = async (req, res) => {
  try {
    console.log("📩 Incoming message:", req.body);

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};