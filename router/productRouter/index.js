const { productController } = require("../../controller");

const router = require("express").Router();

router.post("/product/add-product", productController.addProduct);
router.delete("/product/:id", productController.deleteProduct);

module.exports = router;
