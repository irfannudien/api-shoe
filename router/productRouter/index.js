const router = require("express").Router();

const { productController } = require("../../controller");

router.post("/product/add-product", productController.addProduct);
router.delete("/product/:id", productController.deleteProduct);

module.exports = router;
