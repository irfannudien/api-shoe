const { Result, check, query } = require("express-validator");
const db = require("../../db");
const { runQuery } = require("../../utils");
const transporter = require("../../helper/nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

module.exports = {
  registerUserData: async (req, res) => {
    const date = new Date();
    const { name, email, phone_number, password } = req.body;

    // ========= EMAIL VALIDATION =========
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // ========= PASSWORD VALIDATION =========
    if (password.length < 8 || password.length > 32) {
      return res
        .status(400)
        .json({ message: "Password must be 8-32 characters" });
    }

    // ========= CHECK EXISTING EMAIL =========
    const checkEmail = `SELECT id FROM users WHERE email = ?`;
    const emailExist = await runQuery(checkEmail, [email]);
    if (emailExist.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // ========= PHONE NUMBER VALIDATION =========
    if (phone_number && !/^\d{8,15}$/.test(phone_number)) {
      return res
        .status(400)
        .json({ message: "Phone number must be 8-15 digits" });
    }
    // ========= ZIP CODE VALIDATION =========
    // if (zip_code && !/^\d{3,}$/.test(zip_code)) {
    //   return res
    //     .status(400)
    //     .json({ message: "Zip code must be numeric (min 3 digits)" });
    // }

    try {
      // ======= INSERT USER =======
      const insertUser = `
      INSERT INTO users (name, email, password, register_method, register_status, created_at, updated_at)
      VALUES (?, ?, ?, 'Manual', 'Unverified', ?, ?)
      `;

      const hashPassword = await bcrypt.hash(password, 10);

      const userData = [name, email, hashPassword, date, date];

      const userResult = await runQuery(insertUser, userData);
      console.log("Insert Result: ", userResult);
      const userId = userResult.insertId;

      // ======= INSERT PROFILE =======
      const insertProfile = `
      INSERT INTO users_profile (users_id, phone_number, created_at, updated_at)
      VALUES (?, ?, ?, ?)`;

      const profileData = [userId, phone_number, date, date];

      const profileResult = await runQuery(insertProfile, profileData);
      console.log("Profile Result: ", profileResult);

      // ======= INSERT CART =======
      const insertCart = `
      INSERT INTO cart (users_id, name, email, status, created_at, updated_at)
      VALUES (?, ?, ?, 'Active', ?, ?)`;

      const cartData = [userId, name, email, date, date];
      const cartResult = await runQuery(insertCart, cartData);
      console.log("Cart Result", cartResult);

      const mailToUser = {
        from: "KC Shoeshop <ridho@coursenese.com>",
        to: email,
        subject: "Welcome to KC Shoeshop - Please verify your email",
        html: `
          <div style="max-width:600px; margin:0 auto; font-family:Arial,sans-serif; padding:30px; background:#f9f9f9; color:#333; text-align:center;">
            <img src="https://www.linkpicture.com/q/logo_308.png" alt="KC Shoeshop" style="max-width:150px; margin-bottom:20px;" />

            <h2 style="color:#222;">Welcome to KC Shoeshop!</h2>
            <p style="font-size:16px; line-height:1.5;">
              Hi ${email},<br/>
              Thank you for registering with KC Shoeshop. We're excited to have you with us!
            </p>

            <div style="margin:30px 0;">
              <p style="font-size:16px;">
                To complete your registration, please verify your email address by clicking the button below:
              </p>
              <a href="http://localhost:2000/api/user/verify-email?email=${email}" 
                style="display:inline-block; margin-top:15px; padding:12px 24px; background-color:#28a745; color:#fff; text-decoration:none; border-radius:5px; font-size:16px;">
                Verify My Account
              </a>
            </div>

            <p style="font-size:14px; color:#777; margin-top:20px;">
              If you didn’t sign up for KC Shoeshop, you can ignore this email.
            </p>

            <div style="margin-top:40px; font-size:12px; color:#aaa;">
              &copy; 2025 KC Shoeshop. All rights reserved.
            </div>
          </div>
          `,
      };

      const triggerMail = await transporter.sendMail(mailToUser);

      res.status(200).json({
        message: "Register success",
        email_status: triggerMail.response,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  loginUser: async (req, res) => {
    const { email, password, rememberMe } = req.body;

    try {
      const selectUser = `
      SELECT * FROM users
      WHERE email = ?
      `;

      const result = await runQuery(selectUser, [email]);

      if (result.length === 0) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      console.log("RESULT LOGIN USER", result);

      const userData = result[0];

      const isHashed =
        userData.password.startsWith("$2a$") ||
        userData.password.startsWith("$2b$");
      let isMatch = false;

      if (isHashed) {
        isMatch = await bcrypt.compare(password, userData.password);
      } else {
        isMatch = password === userData.password;

        if (isMatch) {
          const newHashed = await bcrypt.hash(password, 10);
          const updatedPassword = `
          UPDATE users SET password = ?
          WHERE id = ?`;
          await runQuery(updatedPassword, [newHashed, userData.id]);
        }
      }

      if (!isMatch) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      const expires = rememberMe ? "7d" : "1h";
      const token = jwt.sign(
        {
          id: userData.id,
          email: userData.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: expires }
      );

      console.log("Generate JWT Token", token);
      console.log("Token will expire in", expires);

      res.status(200).json({
        message: "Login success",
        token,
        data: [{ name: userData.name, email: userData.email }],
      });
    } catch (err) {
      console.log("Login Error", err);
      res.status(500).json({ message: "Login failed, please try again" });
    }
  },

  getUserData: (req, res) => {
    const query = "SELECT * FROM users";

    db.query(query, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Internal server error");
      }
      console.log(result);
      res.status(200).send(result);
    });
  },

  inputUserData: (req, res) => {
    try {
      const userData = {
        ...req.body,
        created_at: new Date(),
      };
      const query = `INSERT INTO users SET ?`;
      db.query(query, userData, (err, result) => {
        if (err) {
          console.log(err);
        }
      });
    } catch (err) {
      console.log(err, "INI ERROR");
      res.status(500).send(err);
    }
  },

  editUserData: async (req, res) => {
    const { id } = req.params;
    const { updatedUserData = {}, updatedProfileData = {} } = req.body;

    const now = new Date();

    try {
      await runQuery("UPDATE users SET ? WHERE id = ?", [
        { ...updatedUserData, updated_at: now },
        id,
      ]);

      await runQuery("UPDATE users_profile SET ? WHERE users_id = ?", [
        { ...updatedProfileData, updated_at: now },
        id,
      ]);

      res.status(200).send({
        message: "User & profile updated successfully",
        data: {
          user: updatedUserData,
          profile: updatedProfileData,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal server error");
    }
  },

  // editUserProfile: async (req, res) => {
  //   const { id } = req.params;
  //   const { ...profileData } = req.body;

  //   profileData.updated_at = new Date();

  //   try {
  //     await runQuery(`UPDATE users_profile SET ? WHERE users_id = ?`, [
  //       profileData,
  //       id,
  //     ]);
  //     res
  //       .status(200)
  //       .send({ success: true, message: "User profile updated successfully" });
  //   } catch (err) {
  //     console.log(err);
  //     res.status(500).send("Internal server error");
  //   }
  // },

  deleteUserData: async (req, res) => {
    const id = parseInt(req.params.id);

    try {
      await runQuery("START TRANSACTION");

      // ========= CHECK USER =========
      const checkUserQuery = `SELECT * FROM users WHERE id = ?`;
      const userResult = await runQuery(checkUserQuery, [id]);

      if (userResult.length === 0) {
        return res
          .status(404)
          .json({ message: `User with ID ${id} not found` });
      }

      // ========= AMBIL CART_ID =========
      const getCartIdQuery = `SELECT id FROM cart WHERE users_id = ?`;
      const cartResult = await runQuery(getCartIdQuery, [id]);

      if (cartResult.length > 0) {
        const cartId = cartResult[0].id;

        // ========= DELETE FROM CART_ITEM =========
        const deleteCartItemQuery = `DELETE FROM cart_item WHERE cart_id = ?`;
        await runQuery(deleteCartItemQuery, [cartId]);
      }

      // ========= DELETE FROM USER PROFILE =========
      const deleteProfileQuery = `DELETE FROM users_profile WHERE users_id = ?`;
      await runQuery(deleteProfileQuery, [id]);

      // ========= DELETE FROM CART =========
      const deleteCartQuery = `DELETE FROM cart WHERE users_id = ?`;
      await runQuery(deleteCartQuery, [id]);

      // ========= DELETE FROM USERS =========
      const deleteUserQuery = `DELETE FROM users WHERE id = ?`;
      await runQuery(deleteUserQuery, [id]);

      await runQuery("COMMIT");

      res.status(200).json({
        message: `User ID ${id} and all related data have been successfully deleted.`,
      });
    } catch (err) {
      await runQuery("ROLLBACK");
      console.log(err);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  verifyEmail: async (req, res) => {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    try {
      // ========= CHECK EMAIL USER =========
      const checkEmail = `
      SELECT *
      FROM users
      WHERE email = ?`;

      const emailResult = await runQuery(checkEmail, [email]);

      if (emailResult.length === 0) {
        res.status(400).json({ message: "Email not found" });
      }

      if (emailResult[0].register_status === "Verified") {
        res.status(400).json({ message: "Email already verified" });
      }

      // ========= UPDATE USER STATUS =========
      const updateUserStatus = `
      UPDATE users
      SET register_status = 'Verified'
      WHERE email = ? AND register_status = 'Unverified'
      `;

      await runQuery(updateUserStatus, [email]);

      res.status(200).json({ message: "Email verified successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  deleteUserData1: (req, res) => {
    const id = parseInt(req.params.id);

    const checkIdQuery = `SELECT * FROM users WHERE id = ${id}`;
    db.query(checkIdQuery, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Internal server error");
      }

      if (result.length === 0) {
        console.log("User not found!");
        return res.status(200).send(`row with id : ${id} doesnt exist`);
      }
    });

    const deleteUserQuery = `DELETE FROM users WHERE id = ${id}`;
    db.query(deleteUserQuery, (err2, result2) => {
      if (err2) {
        return res.status(500).send(err2);
      }
      res.status(200).send(result2);
    });
  },

  getUserProfileId: (req, res) => {
    const { userId } = req.params;
    const query = `
          SELECT 
            u.id, u.name, u.email, u.register_method, u.register_status, u.created_at,
            up.*
          FROM users u
          JOIN users_profile up ON u.id = up.users_id
          WHERE u.id = ?
        `;
    db.query(query, [userId], (err, result) => {
      if (err) return res.status(500).send("Internal server error");
      res.status(200).send(result[0]);
    });
  },
};
