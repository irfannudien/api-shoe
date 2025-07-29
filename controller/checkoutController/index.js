const { runQuery } = require("../../utils");

module.exports = {
  checkoutOrder: async (req, res) => {
    const date = new Date();
    const { users_id, coupon_code, payment_gateway, courier, shipping_cost } =
      req.body;

    try {
      await runQuery("START TRANSACTION");

      // ========= GET USER CART =========
      const getCart = `
      SELECT id FROM cart WHERE users_id = ?`;
      const cartUser = await runQuery(getCart, [users_id]);
      console.log("CART USER: ", cartUser);

      if (cartUser.length === 0) {
        return res.status(404).json({ message: "Cart not found" });
      }

      const cartId = cartUser[0].id;
      console.log("CART ID: ", cartId);

      // ========= GET CART ITEM DATA JOIN =========
      const cartItemsQuery = `
        SELECT 
        ci.*, 
        pst.stock,
        pst.size_id,
        p.product_name, 
        p.price, 
        p.featured_image
        FROM cart_item ci
        JOIN product_size psz ON ci.size = psz.size          
        JOIN product_stock pst 
        ON ci.product_id = pst.product_id 
        AND pst.size_id = psz.id
        JOIN product p ON p.id = ci.product_id
        WHERE ci.cart_id = ?
      `;
      const cartItems = await runQuery(cartItemsQuery, [cartId]);

      if (cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      // ========= CHECK ALL ITEMS ON CART =========
      const outOfStockItems = cartItems.filter(
        (item) => item.quantity > item.stock
      );

      if (outOfStockItems.length > 0) {
        await runQuery("ROLLBACK");
        const totalItems = cartItems.length;
        const item = outOfStockItems[0];

        if (totalItems === 1) {
          message =
            item.stock === 0
              ? `${item.product_name} (size ${item.size}) is out of stock.`
              : `${item.product_name} (size ${
                  item.size
                }) is low on stock. Only ${item.stock} item${
                  item.stock > 1 ? "s" : ""
                } left. Please update your cart.`;

          return res.status(400).json({ message });
        }

        return res.status(400).json({
          message: `Some products in your cart are out of stock. Please review and update your cart.`,
          items: outOfStockItems.map((i) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            size: i.size,
            requested: i.quantity,
            available: i.stock,
          })),
        });
      }

      // ========= GET USER PROFILE FOR ORDERS =========
      const userProfileQuery = `
        SELECT
        u.name,
        u.email, 
        u.register_status, 
        up.phone_number, 
        up.address, 
        up.city, 
        up.country, 
        up.zip_code
        FROM users u
        JOIN users_profile up ON u.id = up.users_id
        WHERE u.id = ?
      `;

      const userResult = await runQuery(userProfileQuery, [users_id]);
      const user = userResult[0];

      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      if (user.register_status?.toLowerCase() !== "verified") {
        return res
          .status(403)
          .json({ message: "Please verify your account before checkout" });
      }

      // ========= TOTAL AMOUNT =========
      const totalProductAmount = cartItems.reduce(
        (sum, item) => sum + item.total,
        0
      );
      const total_amount = totalProductAmount + shipping_cost;

      // ========= INSERT INTO ORDERS =========
      const insertOrder = `
        INSERT INTO orders 
        (users_id, user_status, name, email, phone_number, address, province, city, country, zip_code, total_amount, coupon_code, payment_gateway, courier, shipping_cost, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const orderValues = [
        users_id,
        "Registered User",
        user.name,
        user.email,
        user.phone_number,
        user.address,
        "Banten",
        user.city,
        user.country,
        user.zip_code,
        total_amount,
        coupon_code,
        payment_gateway,
        courier,
        shipping_cost,
        date,
        date,
      ];

      const orderResult = await runQuery(insertOrder, orderValues);
      const order_id = orderResult.insertId;

      // ========= INSERT ORDER ITEMS & UPDATE STOCK =========
      await Promise.all(
        cartItems.map((item) => {
          const insertItem = `
            INSERT INTO order_items 
            (order_id, product_id, product_name, brand, size, quantity, product_price, featured_image, url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const insertItemValues = [
            order_id,
            item.product_id,
            item.product_name,
            item.brand,
            item.size,
            item.quantity,
            item.price,
            item.featured_image,
            item.url,
            date,
            date,
          ];

          const updateStock = `
            UPDATE product_stock 
            SET stock = stock - ? 
            WHERE product_id = ? AND size_id = ?
          `;
          const updateStockValues = [
            item.quantity,
            item.product_id,
            item.size_id,
          ];

          return Promise.all([
            runQuery(insertItem, insertItemValues),
            runQuery(updateStock, updateStockValues),
          ]);
        })
      );

      // ========= DELETE CART ITEM =========
      await runQuery("DELETE FROM cart_item WHERE cart_id = ?", [cartId]);

      // ========= INSERT TRANSACTIONS =========
      const insertTransaction = `
        INSERT INTO transactions 
        (order_id, payment_gateway, payment_method, payment_type, amount, status, transaction_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await runQuery(insertTransaction, [
        order_id,
        payment_gateway,
        null,
        null,
        total_amount,
        "Payment Pending",
        null,
        date,
        date,
      ]);

      await runQuery("COMMIT");
      res.status(200).json({ message: "Checkout success", order_id });
    } catch (error) {
      await runQuery("ROLLBACK");
      console.error("Checkout Error:", error);
      res.status(500).json({ message: "Checkout failed", error });
    }
  },
};
