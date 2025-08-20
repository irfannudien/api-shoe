const { runQuery } = require("../../utils");

module.exports = {
  addWishlistItem: async (req, res) => {
    const date = new Date();
    const { users_id, product_id } = req.body;

    try {
      // ======= GET USER =======
      const getUser = `
      SELECT id
      FROM users
      WHERE id = ?`;
      const user = await runQuery(getUser, [users_id]);
      console.log("USER DATA", user);
      if (user.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // ======= GET PRODUCT =======
      const getProduct = `
      SELECT id
      FROM product
      WHERE id = ?`;

      const product = await runQuery(getProduct, [product_id]);
      console.log("PRODUCT", product);

      if (product.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }
      // ======= CHECK WISHLIST =======
      const checkWishlist = `
      SELECT id
      FROM wishlist_items
      WHERE users_id = ? AND product_id = ?`;
      const existing = await runQuery(checkWishlist, [users_id, product_id]);
      if (existing.length > 0) {
        return res.status(400).json({ message: "Product already in wishlist" });
      }

      const insertProduct = `
      INSERT INTO wishlist_items (users_id, product_id, created_at)
      VALUES (?, ?, ?)`;
      await runQuery(insertProduct, [users_id, product_id, date]);

      return res.status(201).json({ message: "Added to wishlist" });
    } catch (err) {
      console.log("Error add to wishlist", err);
      return res.status(500).json({ message: "Error add to wishlist" });
    }
  },

  getWishlistItem: async (req, res) => {
    const { users_id } = req.query;

    try {
      // ======= GET USER =======
      const getUser = `
      SELECT id
      FROM users
      WHERE id = ?`;

      const user = await runQuery(getUser, [users_id]);
      if (user.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // ======= GET WISHLIST =======
      const getWishlist = `
      SELECT wi.product_id, p.product_name, p.price, p.brand, p.featured_image
      FROM wishlist_items wi
      JOIN product p ON wi.product_id = p.id
      WHERE wi.users_id = ?`;

      const wishlist = await runQuery(getWishlist, [users_id]);
      console.log("WISHLIST ITEM: ", wishlist);

      return res.status(200).json({ message: wishlist });
    } catch (err) {
      console.log("Error get wishlist", err);
      return res.status(500).json({ message: "Error get wishlist" });
    }
  },

  deleteWishlistItem: async (req, res) => {
    const { users_id, product_id } = req.body;

    try {
      // ======= GET PRODUCT =======
      const getProduct = `
      SELECT p.product_name 
      FROM wishlist_items wi
      JOIN product p ON wi.product_id = p.id
      WHERE wi.users_id = ? AND wi.product_id = ?`;

      const product = await runQuery(getProduct, [users_id, product_id]);
      console.log("PRODUCT", product);

      if (product.length === 0) {
        return res.status(404).json({ message: "Item not found in wishlist" });
      }

      const productName = product[0].product_name;

      const deleteWishlistItem = `
      DELETE FROM wishlist_items
      WHERE users_id = ?
      AND product_id = ?`;

      await runQuery(deleteWishlistItem, [users_id, product_id]);

      return res
        .status(200)
        .json({ message: `${productName} remove from wishlist` });
    } catch (err) {
      console.log("Error remove from wishlist", err);
      return res.status(500).json({ message: "Error remove from wishlist" });
    }
  },
};
