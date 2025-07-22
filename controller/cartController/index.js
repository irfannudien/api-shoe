const { query } = require("express-validator");
const db = require("../../db");
const { runQuery } = require("../../utils");

module.exports = {
  getUserCartId: (req, res) => {
    const userId = req.params.userId;
    const query = `
        SELECT 
        u.id AS users_id, u.name, u.email, u.register_method, u.register_status, u.created_at,
        up.id AS profile_id, up.phone_number, up.address, up.city, up.country, up.zip_code, up.profile_picture,
        c.id AS cart_id,
        ci.product_id,
        ci.product_name,
        ci.brand,
        ci.category,
        ci.size,
        ci.quantity,
        p.price,
        p.featured_image
      FROM users u
      JOIN users_profile up ON u.id = up.users_id
      JOIN cart c ON u.id = c.users_id
      JOIN cart_item ci ON c.id = ci.cart_id
      JOIN product p ON ci.product_id = p.id
      WHERE u.id = ?
    `;
    db.query(query, [userId], (err, result) => {
      if (err) return res.status(500).send("Internal server error");
      res.status(200).send(result);
    });
  },

  addItemToCart: async (req, res) => {
    const date = new Date();
    let { users_id, product_id, size_id, quantity } = req.body;
    quantity = parseInt(quantity);

    if (!users_id || !product_id || !size_id || quantity == null) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!Number.isInteger(users_id) || users_id <= 0) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (!Number.isInteger(product_id) || product_id <= 0) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    if (!Number.isInteger(size_id) || size_id <= 0) {
      return res.status(400).json({ message: "Invalid size ID" });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res
        .status(400)
        .json({ message: "Quantity must be a number greater than 0" });
    }

    try {
      // ========= GET CART =========
      const getCart = `
      SELECT * FROM cart WHERE users_id = ?`;
      const cartUser = await runQuery(getCart, [users_id]);
      console.log("CART USER: ", cartUser);

      if (cartUser.length === 0) {
        return res.status(404).json({ message: "Cart not found" });
      }

      const cartId = cartUser[0].id;
      console.log("CART ID: ", cartId);

      // ========= GET PRODUCT =========
      const getProduct = `
      SELECT * FROM product WHERE id = ?`;
      const productData = await runQuery(getProduct, [product_id]);
      console.log("PRODUCT DATA", productData);

      if (productData.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }
      const product = productData[0];
      console.log("PRODUCT", product);

      // ========= GET SIZE =========
      const getSize = `
      SELECT * FROM product_size WHERE id = ?`;
      const sizeData = await runQuery(getSize, [size_id]);
      console.log("SIZE DATA", sizeData);

      if (sizeData.length === 0) {
        return res.status(404).json({ message: "Size not found" });
      }

      const sizeLabel = sizeData[0].size;
      console.log("SIZE LABEL: ", sizeLabel);

      // ========= GET STOCK =========
      const getStock = `
      SELECT * FROM product_stock WHERE product_id = ? AND size_id = ?`;
      const stockData = await runQuery(getStock, [product_id, size_id]);
      console.log("STOCK DATA", stockData);

      if (stockData.length === 0) {
        return res.status(404).json({ message: "Stock data not found" });
      }

      const stockProduct = stockData[0];
      console.log("STOOOCCKKK PRODUCT", stockProduct);

      if (stockProduct.stock === 0) {
        return res.status(400).json({ message: "Stock Unavailable" });
      }

      if (stockProduct.stock < quantity) {
        return res.status(400).json({
          message: `Only ${stockProduct.stock} item's left in stock.`,
        });
      }

      const totalPrice = product.price * quantity;
      console.log("TOTAL PRICE", totalPrice);
      const totalWeight = product.weight * quantity;
      console.log("TOTAL WEIGHT", totalWeight);

      // ========= INSERT ITEM TO CART =========
      const insertItemToCart = `
      INSERT INTO cart_item (cart_id, product_id, product_name, brand, category, size, quantity, weight, total, url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const itemData = [
        cartId,
        product.id,
        product.product_name,
        product.brand,
        product.category,
        sizeLabel,
        quantity,
        totalWeight,
        totalPrice,
        product.featured_image,
        date,
        date,
      ];

      const insertItemResult = await runQuery(insertItemToCart, itemData);
      console.log("RESULT ITEM DATA: ", insertItemResult);

      // ========= UPDATE STOCK DATA =========
      const updateStock = `
      UPDATE product_stock SET stock = stock - ? WHERE id = ?`;
      const resultStock = await runQuery(updateStock, [
        quantity,
        stockProduct.id,
      ]);
      console.log("RESULT UPDATE STOCK", resultStock);

      res.status(201).json({ message: "Add item to cart success" });
    } catch (err) {
      console.log("Add item failed", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  updateCartItem: async (req, res) => {
    const date = new Date();
    let { cart_item_id, size_id, quantity } = req.body;
    quantity = parseInt(quantity);

    if (!cart_item_id || !size_id || quantity == null) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!Number.isInteger(cart_item_id) || cart_item_id <= 0) {
      return res.status(400).json({ message: "Invalid cart item ID" });
    }

    if (!Number.isInteger(size_id) || size_id <= 0) {
      return res.status(400).json({ message: "Invalid size ID" });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res
        .status(400)
        .json({ message: "Quantity must be a number greater than 0" });
    }

    try {
      // ========= GET CART ITEM =========
      const getItem = `
      SELECT * FROM cart_item WHERE id = ?`;
      const itemData = await runQuery(getItem, [cart_item_id]);
      console.log("CART ITEM", itemData);

      if (itemData.length === 0) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      const itemProduct = itemData[0];
      const prevQty = itemProduct.quantity;
      const productId = itemProduct.product_id;
      const updateQty = quantity - prevQty;
      const weightPerItem = itemProduct.weight / prevQty;
      const totalWeight = weightPerItem * quantity;

      // ========= GET SIZE =========
      const getSize = `
      SELECT * FROM product_size WHERE id = ?`;
      const sizeData = await runQuery(getSize, [size_id]);
      console.log("SIZE DATA", sizeData);
      if (sizeData.length === 0) {
        return res.status(404).json({ message: "Size not found" });
      }
      const sizeLabel = sizeData[0].size;
      const isSizeChange = sizeLabel !== itemProduct.size;

      // ========= GET STOCK =========
      const getStock = `
      SELECT * FROM product_stock WHERE product_id = ? AND size_id = ?`;
      const stockData = await runQuery(getStock, [productId, size_id]);
      console.log("STOCK DATA", stockData);
      if (stockData.length === 0) {
        return res.status(404).json({ message: "Stock unavailable" });
      }

      const stockProduct = stockData[0];
      if (stockProduct.stock === 0) {
        return res.status(400).json({ message: "Stock product unavailable" });
      }

      if (
        (isSizeChange && stockProduct.stock < quantity) ||
        (!isSizeChange && stockProduct.stock < updateQty)
      ) {
        return res
          .status(400)
          .json({ message: `Only ${stockProduct.stock} item's left in stock` });
      }

      const totalPrice = (itemProduct.total / prevQty) * quantity;
      console.log("TOTAL PRICE UPDATE", totalPrice);

      // ========= UPDATE CART ITEM =========
      const updateCartItem = `
      UPDATE cart_item SET size = ?, quantity = ?, weight = ?, total = ?, updated_at = ?
      WHERE id = ?`;
      const itemUpdate = [
        sizeLabel,
        quantity,
        totalWeight,
        totalPrice,
        date,
        cart_item_id,
      ];
      const updateData = await runQuery(updateCartItem, itemUpdate);
      console.log("RESULT UPDATE DATA: ", updateData);

      if (isSizeChange) {
        // ========= GET PREV SIZE DATA =========
        const getPrevSizeData = `
        SELECT id FROM product_size WHERE size = ?`;
        const prevSizeData = await runQuery(getPrevSizeData, [
          itemProduct.size,
        ]);
        console.log("PREVIOUS SIZE DATA", prevSizeData);

        if (prevSizeData.length > 0) {
          // ========= UPDATE PREV STOCK IF SIZE CHANGE ========
          const prevSizeId = prevSizeData[0].id;
          const updateStock = `
          UPDATE product_stock SET stock = stock + ?
          WHERE product_id = ? AND size_id = ?`;
          await runQuery(updateStock, [prevQty, productId, prevSizeId]);
        }

        // ========= UPDATE STOCK DATA SIZE =========
        const updateStock = `
        UPDATE product_stock SET stock = stock - ?
        WHERE id = ?
        `;
        const resultStock = await runQuery(updateStock, [
          quantity,
          stockProduct.id,
        ]);
        console.log("RESULT UPDATE STOCK SIZE", resultStock);
      } else {
        // ========= UPDATE STOCK DATA QUANTITY =========
        const updateStockQty = `
        UPDATE product_stock SET stock = stock - ?
        WHERE id = ?
        `;
        const resultStock = await runQuery(updateStockQty, [
          updateQty,
          stockProduct.id,
        ]);
        console.log("RESULT UPDATE STOCK QTY", resultStock);
      }

      res.status(200).json({ message: "Update item success" });
    } catch (err) {
      console.log("Update item failed", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  deleteCartItem: async (req, res) => {
    const { users_id, product_id, size_id } = req.body;

    if (!users_id || !product_id || !size_id) {
      return res.status(400).json({ message: "All field are required" });
    }

    try {
      // ========= GET CART =========
      const getCart = `SELECT id FROM cart WHERE users_id = ?`;
      const cartUser = await runQuery(getCart, [users_id]);
      console.log("CART USER FOR DELETE: ", cartUser);

      if (cartUser.length === 0) {
        return res.status(404).json({ message: "Cart not found" });
      }
      const cartId = cartUser[0].id;

      // ========= GET SIZE =========
      const getSize = `
      SELECT * FROM product_size WHERE id = ?`;
      const sizeData = await runQuery(getSize, [size_id]);
      console.log("SIZE DATA FOR DELETE", sizeData);

      if (sizeData.length === 0) {
        return res.status(404).json({ message: "Size not found" });
      }

      const sizeLabel = sizeData[0].size;
      console.log("SIZE LABEL", sizeLabel);

      // ========= GET CART ITEM =========
      const getItem = `
      SELECT * FROM cart_item WHERE cart_id = ? AND product_id = ? AND size = ?`;
      const itemData = await runQuery(getItem, [cartId, product_id, sizeLabel]);
      console.log("ITEM DATA FOR DELETE", itemData);

      if (itemData.length === 0) {
        return res.status(404).json({ message: "Item not found" });
      }
      const item = itemData[0];
      const quantity = item.quantity;

      // ========= DELETE ITEM DATA =========
      const deleteCartItem = `
      DELETE FROM cart_item WHERE id = ?`;
      const deleteItem = await runQuery(deleteCartItem, [item.id]);
      console.log("DELETE ITEM", deleteItem);

      // ========= UPDATE STOCK DATA =========
      const updateStock = `
      UPDATE product_stock SET stock = stock + ? WHERE product_id = ? AND size_id = ?`;
      const resultStock = await runQuery(updateStock, [
        quantity,
        product_id,
        size_id,
      ]);
      console.log("RESULT UPDATE STOCK", resultStock);

      res.status(200).json({ message: "Delete item success" });
    } catch (err) {
      console.log("ERROR", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
