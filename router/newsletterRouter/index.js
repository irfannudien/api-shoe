const router = require("express").Router();

const { newsLetterController } = require("../../controller");

router.post(
  "/newsletter/add-subscriber",
  newsLetterController.insertNewsletterSubscriber
);

module.exports = router;
