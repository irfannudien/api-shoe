const router = require("express").Router();

const { newsController } = require("../../controller");

router.get("/news", newsController.getNews);

module.exports = router;
