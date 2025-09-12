const router = require("express").Router();

const { userController } = require("../../controller");
const { authenticateToken } = require("../../helper/auth");

router.get("/user/getuser", authenticateToken, userController.getUserData);
router.get(
  "/user/profile/:userId",
  authenticateToken,
  userController.getUserProfileId
);

router.get("/user/verify-email", userController.verifyEmail);
router.post("/user/register", userController.registerUserData);
router.post("/user/login", userController.loginUser);

router.post("/user/inputuser", authenticateToken, userController.inputUserData);
router.put(
  "/user/edituser/:id",
  authenticateToken,
  userController.editUserData
);
// router.put("/user/edit-user-profile/:id", userController.editUserProfile);
router.delete(
  "/user/deleteuser/:id",
  authenticateToken,
  userController.deleteUserData
);

module.exports = router;
