const router = require("express").Router();

const { productController } = require("../../controller");

router.post("/products/add-product", productController.addProduct);
router.get("/products", productController.getAllProduct);
router.delete("/products/:id", productController.deleteProduct);

module.exports = router;
