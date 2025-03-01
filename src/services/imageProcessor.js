const express = require("express");
const Request = require("../models/Request");
const ImageKit = require("imagekit");
require("dotenv").config()

var imagekit = new ImageKit({
  publicKey: process.env.publicKey,
  privateKey: process.env.privateKey,
  urlEndpoint: process.env.urlEndpoint,
});
const router = express.Router();

const processImages = async (req, res, requestId) => {
  try {
    const request = await Request.findOne({ requestId });
    request.status = "processing";
    await request.save();

    const processedProducts = await Promise.all(
      request.products.map(async (product) => {
        const outputUrls = await Promise.all(
          product.inputImageUrls.map(async (inputUrl, index) => {
            const outputUrls = await uploadProcessedImage(inputUrl, index + 1);
            return outputUrls;
          })
        );
        return {
          ...product._doc,
          outputImageUrls: outputUrls.filter((url) => url !== null),
        };
      })
    );
    request.status = "completed";
    request.products = processedProducts;

    await request.save();

    res.json({
      requestId,
      status: request.status,
      products: processedProducts,
    });
  } catch (error) {
    await Request.findOneAndUpdate({ requestId }, { status: "failed" });

    console.error("Processing error:", error);
    res.status(500).json({
      error: "Image processing failed",
      details: error.message,
    });
  }
};

const uploadProcessedImage = async (urls, index) => {
  const res = await fetch(urls);
  const buffer = await res.arrayBuffer();
  const imageBuffer = Buffer.from(buffer, "binary");

  const uploadResponse = await imagekit.upload({
    file: imageBuffer,
    fileName: `output-url-${index}.jpg`,
    folder: "/output-image",
  });

  const transformedUrl = imagekit.url({
    path: uploadResponse.filePath,
  });

  return transformedUrl;
};

module.exports = {
  router,
  processImages,
  uploadProcessedImage,
};
