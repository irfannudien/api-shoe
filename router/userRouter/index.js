const router = require("express").Router();

const { userController } = require("../../controller");

router.get("/user/getuser", userController.getUserData);
router.get("/user/profile/:userId", userController.getUserProfileId);
router.get("/user/verify-email", userController.verifyEmail);

router.post("/user/register", userController.registerUserData);
router.post("/user/login", userController.loginUser);
router.post("/user/inputuser", userController.inputUserData);

router.put("/user/edituser/:id", userController.editUserData);
// router.put("/user/edit-user-profile/:id", userController.editUserProfile);

router.delete("/user/deleteuser/:id", userController.deleteUserData);

module.exports = router;
