const { midtransController } = require("../../controller");

const router = require("express").Router();

router.post("/transactions", midtransController.handleMidtransWebhook);

module.exports = router;
