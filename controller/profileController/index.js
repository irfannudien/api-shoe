const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const { runQuery } = require("../../utils");
const db = require("../../db");

module.exports = {
  forgotPassword: async (req, res) => {
    const { email } = req.body;

    try {
      // ========= CHECK EMAIL REGISTERED =========
      const checkEmail = `SELECT * FROM users WHERE email = ?`;
      const emailResult = await runQuery(checkEmail, [email]);

      if (emailResult.length === 0) {
        return res.status(404).json({ message: "Email not found" });
      }

      // ========= CREATE TOKEN EMAIL =========
      const token = Math.random().toString(36).substring(2, 12);

      // ========= SEND TO EMAIL =========
      const mailToUser = {
        from: "KC Shoeshop <ridho@coursenese.com>",
        to: email,
        subject: "Reset Your Password - KC Shoeshop",
        html: `
          <div style="max-width:600px; margin:0 auto; font-family:Arial, sans-serif; padding:30px; background:#f8f8f8; color:#333; text-align:center;">
            <h2 style="color:#222;">Password Reset Request</h2>
            <p style="font-size:16px; line-height:1.5;">
              We received a request to reset your password for your KC Shoeshop account.<br/>
              If this was you, click the button below to reset your password.
            </p>

            <a href="http://localhost:2000/api/user/reset-password?token=${token}"
              style="display:inline-block; margin-top:20px; padding:12px 24px; background-color:#007bff; color:#fff; text-decoration:none; border-radius:5px; font-size:16px;">
              Reset Password
            </a>

            <p style="font-size:14px; color:#777; margin-top:30px;">
              If you didn’t request this, you can safely ignore this email.<br/>
              This password reset link will expire in 1 hour.
            </p>

            <div style="margin-top:40px; font-size:12px; color:#aaa;">
              &copy; 2025 KC Shoeshop. All rights reserved.
            </div>
          </div>
        `,
      };

      const triggerMail = await transporter.sendMail(mailToUser);

      res.status(200).json({
        message: "Reset link sent to email",
        email_status: triggerMail.response,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  resetPassword: async (req, res) => {
    const { email } = req.query;
    const { new_password } = req.body;

    if (new_password.length < 8 || new_password.length > 32) {
      return res
        .status(400)
        .json({ message: "Password must be 8-32 characters" });
    }

    try {
      // ========= CHECK EMAIL =========
      const checkEmail = `SELECT * FROM users WHERE email = ?`;
      const userEmail = await runQuery(checkEmail, [email]);

      if (userEmail.length === 0) {
        return res.status(404).json({ message: "Email not found" });
      }

      // ========= HASH NEW PASSWORD =========
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(new_password, saltRounds);

      // ========= UPDATE NEW PASSWORD =========
      const updatePassword = `
        UPDATE users SET password = ? WHERE email = ?`;

      await runQuery(updatePassword, [hashedPassword, email]);

      res
        .status(200)
        .json({ message: "Password has been updated successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  uploadProfilePicture: (req, res) => {
    const id = parseInt(req.params.id);

    // CHECK FILE
    if (!req.file) {
      return res.status(400).json({ message: "No picture provided" });
    }

    // GET OLD PATH PHOTO
    const selectProfile = `
    SELECT profile_picture
    FROM users_profile WHERE users_id = ?`;

    db.query(selectProfile, [id], (err, resultSelect) => {
      if (err) {
        return res.status(500).send("Get data profile picture error");
      }

      // DELETE PREV FILE IF EXIST
      if (resultSelect[0] && resultSelect[0].profile_picture) {
        const oldImagePath = path.join(
          // __dirname,
          // "../public",
          process.cwd(),
          "public",
          resultSelect[0].profile_picture
        );
        fs.unlink(oldImagePath, (errUnlink) => {
          if (errUnlink) console.log("FAILED DELETE PHOTO", errUnlink);
        });
      }

      const imagePath = `profile-picture/${req.file.filename}`;
      const updateQuery = `UPDATE users_profile SET profile_picture = ? WHERE users_id = ?`;

      db.query(updateQuery, [imagePath, id], (err, result) => {
        if (err) {
          return res.status(500).send("Upload error");
        }

        res.status(200).json({
          message: "Upload profile success",
          data: result,
          fileUrl: imagePath,
        });
      });
    });
  },
};
