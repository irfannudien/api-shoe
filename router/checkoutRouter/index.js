const router = require("express").Router();

const { checkoutController } = require("../../controller");

router.post("/orders", checkoutController.checkoutOrder);

module.exports = router;
