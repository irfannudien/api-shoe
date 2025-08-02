const router = require("express").Router();
const { profileController } = require("../../controller");
const { upload } = require("../../helper/multer");

const uploader = upload("./public/profile-picture");

router.post("/profile/forgot-password", profileController.forgotPassword);
router.post("/profile/reset-password", profileController.resetPassword);
router.post(
  "/profile/upload-profile/:id",
  uploader,
  profileController.uploadProfilePicture
);

module.exports = router;
