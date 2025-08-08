const { createTransaction } = require("../../helper/midtrans");
const getShippingCost = require("../../helper/rajaongkir");
const { runQuery } = require("../../utils");

module.exports = {
  checkoutOrder: async (req, res) => {
    const date = new Date();
    const { users_id, coupon_code, payment_gateway, courier, service } =
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
      console.log("CART ITEMS: ", cartItems);

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

      console.log("USER RESULT: ", userResult);
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
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const totalWeight = cartItems.reduce((sum, item) => sum + item.weight, 0);

      const courierService = `${courier}-${service}`;

      // ========= SHIPPING COST =========
      const shippingCost = await getShippingCost({
        origin: "137",
        userCityName: user.city,
        weight: totalWeight,
        courier,
        service,
      });

      console.log("SHIPPING COST: ", shippingCost);
      if (!shippingCost) {
        await runQuery("ROLLBACK");
        return res
          .status(500)
          .json({ message: "Failed to fetch shipping cost" });
      }

      const total_amount = totalProductAmount + Number(shippingCost.cost);

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
        shippingCost.province,
        shippingCost.city,
        user.country,
        user.zip_code,
        total_amount,
        coupon_code,
        payment_gateway,
        courierService,
        shippingCost.cost,
        date,
        date,
      ];

      const orderResult = await runQuery(insertOrder, orderValues);
      console.log("ORDER RESULT", orderResult);
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

      // ========= MIDTRANS TRANSACTION =========
      // let snap = new midtransClient.Snap({
      //   isProduction: false,
      //   serverKey: process.env.MIDTRANS_SERVER_KEY,
      //   clientKey: process.env.MIDTRANS_CLIENT_KEY,
      // });

      // let parameter = {
      //   transaction_details: {
      //     order_id: `ORDER-${order_id}`,
      //     gross_amount: total_amount,
      //   },
      //   credit_card: {
      //     secure: true,
      //   },
      //   customer_details: {
      //     first_name: user.name,
      //     email: user.email,
      //     phone: user.phone_number || null,
      //     billing_address: {
      //       address: user.address,
      //     },
      //   },
      //   item_details: [
      //     ...cartItems.map((item) => ({
      //       id: item.product_id,
      //       name: item.product_name,
      //       price: Number(item.price),
      //       quantity: item.quantity,
      //     })),
      //     {
      //       id: "shipping",
      //       name: "Shipping Cost",
      //       price: Number(shipping_cost),
      //       quantity: 1,
      //     },
      //   ],
      // };

      // const midtransResponse = await snap.createTransaction(parameter);

      const midtransResponse = await createTransaction({
        order_id,
        cartItems,
        shippingCost,
        user,
      });

      console.log("MIDTRANS RESPONSE: ", midtransResponse);

      // ========= INSERT TRANSACTIONS =========
      const insertTransaction = `
        INSERT INTO transactions
        (order_id, payment_gateway, payment_method, payment_type, amount, status, transaction_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const transactionsValue = [
        order_id,
        payment_gateway,
        null,
        null,
        total_amount,
        "Payment Pending",
        `ORDER-${order_id}`,
        date,
        date,
      ];

      await runQuery(insertTransaction, transactionsValue);

      await runQuery("COMMIT");
      res.status(200).json({
        message: "Checkout success",
        order_id,
        snap_url: midtransResponse.redirect_url,
      });
    } catch (error) {
      await runQuery("ROLLBACK");
      console.error("Checkout Error:", error);
      res.status(500).json({ message: "Checkout failed", error });
    }
  },
};
