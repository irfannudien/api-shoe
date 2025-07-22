const router = require("express").Router();

const { rajaOngkirController } = require("../../controller");

router.get("/rajaongkir/provinces", rajaOngkirController.getProvince);
router.get("/rajaongkir/city/:province_id", rajaOngkirController.getCity);
router.post("/rajaongkir/cost/", rajaOngkirController.getCost);

module.exports = router;
