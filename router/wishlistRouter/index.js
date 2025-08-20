const { wishlistController } = require("../../controller");

const router = require("express").Router();

router.post("/wishlist/add", wishlistController.addWishlistItem);
router.get("/wishlist/get", wishlistController.getWishlistItem);
router.delete("/wishlist/delete", wishlistController.deleteWishlistItem);

module.exports = router;
