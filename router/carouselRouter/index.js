const router = require("express").Router();
const { carouselController } = require("../../controller");
const { upload } = require("../../helper/multer");

const uploader = upload("carousel");

router.post("/upload-carousel", uploader, carouselController.uploadCarousel);

module.exports = router;
