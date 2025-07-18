const router = require("express").Router();

const { userController } = require("../../controller");

router.post("/user/register", userController.registerUserData);
router.get("/user/getuser", userController.getUserData);
router.post("/user/inputuser", userController.inputUserData);
router.put("/user/edituser", userController.editUserData);
router.delete("/user/deleteuser/:id", userController.deleteUserDataProfile);

router.get("/user/profile/:userId", userController.getUserProfileId);

module.exports = router;
