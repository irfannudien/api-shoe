const { runQuery } = require("../../utils");

module.exports = {
  uploadCarousel: async (req, res) => {
    const { quote } = req.body;
    const image = req.file;

    if (!image) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    try {
      const imagePath = `carousel/${image.filename}`;
      const insertCarousel = `
      INSERT INTO carousel (image, quote)
      VALUES (?, ?)`;

      const result = await runQuery(insertCarousel, [imagePath, quote]);
      console.log("UPLOAD RESULT: ", result);

      res.status(201).json({
        message: "Carousel uploaded successfully",
        id: result.insertId,
      });
    } catch (err) {
      console.log("Upload carousel failed: ", err);
      res.status(500).json({ message: "Server error uploading carousel" });
    }
  },
};
