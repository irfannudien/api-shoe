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

      return res.status(200).json({ message: "Payment success" });
    } catch (err) {
      console.error("Payment error:", err);
      return res.status(500).json({ message: "Payment failed" });
    }
  },
};
