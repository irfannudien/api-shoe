const router = require("express").Router();

const { newsLetterController } = require("../../controller");

router.post("/newsletter", newsLetterController.insertNewsletterSubscriber);

module.exports = router;
