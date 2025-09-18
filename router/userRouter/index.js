const router = require("express").Router();

const { userController } = require("../../controller");
const { authenticateToken } = require("../../helper/auth");

router.get("/user/getuser", authenticateToken, userController.getUserData); // all user
router.get(
  "/user/profile/:userId",
  authenticateToken,
  userController.getUserProfileId
);

router.post("/auth/verify-email", userController.verifyEmail);
router.post("/auth/resend-token", userController.resendToken);
router.post("/auth/register", userController.registerUserData);
router.post("/auth/login", userController.loginUser);

// router.post("/user/inputuser", authenticateToken, userController.inputUserData);
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
