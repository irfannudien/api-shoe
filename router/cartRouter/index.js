const router = require("express").Router();

const { cartController } = require("../../controller");

router.get("/cart/:userId", cartController.getUserCartId);
router.post("/cart/additem", cartController.addItemToCart);
router.put("/cart/updateitem", cartController.updateCartItem);
router.delete("/cart/deletecartitem", cartController.deleteCartItem);

module.exports = router;
