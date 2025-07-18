const { Result, check, query } = require("express-validator");
const db = require("../../db");
const { runQuery } = require("../../utils");

module.exports = {
  registerUserData: async (req, res) => {
    const date = new Date();
    const {
      name,
      email,
      password,
      register_method,
      phone_number,
      address,
      city,
      country,
      zip_code,
      profile_picture,
    } = req.body;

    try {
      // ======= INSERT USER =======
      const insertUser = `
      INSERT INTO users (name, email, password, register_method, register_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'Unverified', ?, ?)
      `;
      const userData = [name, email, password, register_method, date, date];

      const userResult = await runQuery(insertUser, userData);
      console.log("Insert Result: ", userResult);
      const userId = userResult.insertId;

      // ======= INSERT PROFILE =======
      const insertProfile = `
      INSERT INTO users_profile (users_id, phone_number, address, city, country, zip_code, profile_picture, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const profileData = [
        userId,
        phone_number,
        address,
        city,
        country,
        zip_code,
        profile_picture || null,
        date,
        date,
      ];

      const profileResult = await runQuery(insertProfile, profileData);
      console.log("Profile Result: ", profileResult);

      // ======= INSERT CART =======
      const insertCart = `
      INSERT INTO cart (users_id, name, email, status, created_at, updated_at)
      VALUES (?, ?, ?, 'Active', ?, ?)`;

      const cartData = [userId, name, email, date, date];
      const cartResult = await runQuery(insertCart, cartData);
      console.log("Cart Result", cartResult);

      res.status(200).json({ message: "Register success" });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Internal server error" });
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

  editUserData: (req, res) => {
    const { id, ...userData } = req.body;
    userData.updated_at = new Date();

    const query = `UPDATE users SET ? WHERE id = ${req.body.id}`;
    db.query(query, [userData, id], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Internal server error");
      }
      console.log(result);
      res.status(200).send(result);
    });
  },

  deleteUserData: (req, res) => {
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

  deleteUserDataProfile: (req, res) => {
    const id = parseInt(req.params.id);

    const checkIdQuery = `SELECT * FROM users WHERE id = ${id}`;
    db.query(checkIdQuery, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Internal server error");
      }

      if (result.length === 0) {
        console.log("User not found!");
        return res.status(404).send(`User dengan id: ${id} tidak ditemukan`);
      }

      // Step 1: delete dari user_profile
      const deleteProfile = `DELETE FROM users_profile WHERE users_id = ${id}`;
      db.query(deleteProfile, (err1) => {
        if (err1) return res.status(500).send(err1);

        // Step 2: delete dari cart
        const deleteCart = `DELETE FROM cart WHERE users_id = ${id}`;
        db.query(deleteCart, (err2) => {
          if (err2) return res.status(500).send(err2);

          // Step 3: delete dari users
          const deleteUser = `DELETE FROM users WHERE id = ${id}`;
          db.query(deleteUser, (err3, result3) => {
            if (err3) return res.status(500).send(err3);

            res.status(200).send({
              message: `User ID ${id} dan semua data relasinya berhasil dihapus.`,
            });
          });
        });
      });
    });
  },

  getUserProfileId: (req, res) => {
    const userId = req.params.userId;
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
      res.status(200).send(result);
    });
  },
};
