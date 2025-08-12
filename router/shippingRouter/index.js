const router = require("express").Router();
const { shippingController } = require("../../controller");

router.post("/shipping-history", shippingController.addShippingHistory);
router.get(
  "/shipping-history/:order_id",
  shippingController.getShippingHistory
);

module.exports = router;
