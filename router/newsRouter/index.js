const router = require("express").Router();
const newsController = require("../../controller/newsController");

router.get("/news", newsController.getNews);

module.exports = router;
