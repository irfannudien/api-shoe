const router = require("express").Router();

const { ordersController } = require("../../controller");

router.post("/orders", ordersController.checkoutOrder);

module.exports = router;
