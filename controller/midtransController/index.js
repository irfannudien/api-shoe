const { runQuery } = require("../../utils");

module.exports = {
  handleMidtrans: async (req, res) => {
    const notification = req.body;

    console.log("MIDTRANS NOTIFICATION", notification);

    const { order_id, transaction_id, transaction_status, gross_amount } =
      notification;

    try {
      // ========= REPLACE ORDER ID =========
      const updatedOrderId = order_id.replace("ORDER-", "");

      // ========= TRANSACTION STATUS =========
      let newStatus;
      switch (transaction_status) {
        case "settlement":
          newStatus = "paid";
          break;
        case "pending":
          newStatus = "pending";
          break;
        case "cancel":
          newStatus = "canceled";
          break;
        case "expire":
          newStatus = "expired";
          break;
        case "deny":
        case "failure":
          newStatus = "failed";
          break;
        case "refund":
          newStatus = "refunded";
          break;
        default:
          newStatus = "Unknown";
      }

      // ========= PAYMENT METHOD =========
      let paymentMethod = null;
      let paymentType = notification.payment_type;

      if (paymentType === "bank_transfer") {
        if (notification.va_numbers.length > 0) {
          paymentMethod = notification.va_numbers?.[0]?.bank || "Unknown bank";
        } else if (notification.permata_va_number) {
          paymentMethod = "permata";
        }
      } else if (paymentType === "cstore") {
        paymentMethod = notification.store || notification.payment_code;
      } else if (paymentType === "echannel") {
        paymentMethod = "mandiri";
      } else {
        paymentMethod = paymentType || null;
      }

      console.log("payment_method:", paymentMethod);
      console.log("payment_type:", paymentType);

      // ========= UPDATE TRANSACTIONS =========
      const updateTransaction = `
        UPDATE transactions
        SET status = ?, payment_type = ?, payment_method = ?, transaction_id = ?, amount = ?
        WHERE order_id = ?`;
      const transactionValues = [
        newStatus,
        paymentType,
        paymentMethod,
        transaction_id,
        parseInt(Number(gross_amount)),
        updatedOrderId,
      ];

      await runQuery(updateTransaction, transactionValues);

      return res
        .status(200)
        .json({ message: "Payment success", status: newStatus });

      //   if (transaction_status === "refund") {
      //     const shippingQuery = `SELECT * FROM shipping_history WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`;
      //     const shippingRes = await runQuery(shippingQuery, [updatedOrderId]);
      //     const shipping = shippingRes[0];

      //     if (shipping && shipping.status.toLowerCase() === "received") {
      //       const updateShipping = `
      //   UPDATE shipping_history
      //   SET status = 'canceled', updated_at = NOW()
      //   WHERE id = ?
      // `;
      //       await runQuery(updateShipping, [shipping.id]);
      //     }

      //     const orderItemQuery = `SELECT product_id, size, quantity FROM order_items WHERE order_id = ?`;
      //     const orderItemRes = await runQuery(orderItemQuery, [updatedOrderId]);

      //     if (orderItemRes.length > 0) {
      //       await Promise.all(
      //         orderItemRes.map((item) => {
      //           const updateStock = `UPDATE product_stock SET stock = stock + ? WHERE product_id = ? AND size = ?`;
      //           return runQuery(updateStock, [
      //             item.quantity,
      //             item.product_id,
      //             item.size,
      //           ]);
      //         })
      //       );
      //     }
      //   }

      //   if (transaction_status === "refund") {
      //     return res.status(200).json({
      //       message: "Payment refunded",
      //       status: "refunded",
      //       order_id: updatedOrderId,
      //     });
      //   } else {
      //     return res.status(200).json({
      //       message: "Payment success",
      //       status: newStatus,
      //       order_id: updatedOrderId,
      //     });
      //   }
    } catch (err) {
      console.error("Payment error:", err);
      return res.status(500).json({ message: "Payment failed" });
    }
  },
};
