const { v4: uuidv4 } = require("uuid");
const Request = require("../models/Request");
const imageProcessor = require("../services/imageProcessor");

const uploadFile = async (req, res) => {
  try {
    const requestId = uuidv4();

    const request = new Request({
      requestId,
      products: req.parsedCSV,
    });

    imageProcessor.processImages(req, res, requestId);
    await request.save();
  } catch (error) {
    res.status(500).json({ error: "Failed to process upload" });
  }
};

module.exports = { uploadFile };
