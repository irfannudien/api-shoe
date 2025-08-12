const { runQuery } = require("../../utils");

const allowedNextStatus = {
  received: ["process"],
  process: ["delivery"],
  delivery: ["delivered"],
  delivered: [],
};

module.exports = {
  addShippingHistory: async (req, res) => {
    const date = new Date();
    const { order_id, status } = req.body;
    const statusLower = status.toLowerCase();

    try {
      // ========= GET COURIER =========
      const [selectCourir] = await runQuery(
        `SELECT courier FROM orders WHERE id = ?`,
        [order_id]
      );
      console.log("COURIR: ", selectCourir);

      if (!selectCourir) {
        return res.status(404).json({ message: "Order not found" });
      }
      const courier = selectCourir.courier;

      // ========= CHECK STATUS ORDER RECEIVED =========
      const checkStatusReceived = `
      SELECT order_id
      FROM shipping_history
      WHERE order_id = ?
      AND status = "received"`;
      const [alreadyReceived] = await runQuery(checkStatusReceived, [order_id]);
      console.log("STATUS ORDER_ID: ", alreadyReceived);

      if (alreadyReceived?.order_id && statusLower === "received") {
        return res
          .status(400)
          .json({ message: "Order already marked as received" });
      }

      // ========= CHECK STATUS ORDER =========
      const checkStatusOrder = `
      SELECT status
      FROM shipping_history
      WHERE order_id = ?
      ORDER BY created_at DESC
      LIMIT 1`;
      const [statusOrder] = await runQuery(checkStatusOrder, [order_id]);
      console.log("STATUS ORDER: ", statusOrder);

      const lastStatus = statusOrder ? statusOrder.status.toLowerCase() : null;

      // ========= VALIDATION FIRST STATUS =========
      if (!lastStatus && statusLower !== "received") {
        return res
          .status(400)
          .json({ message: "Order must be received first" });
      }

      // ========= VALIDATION DUPLICATE STATUS =========
      if (statusOrder && statusOrder.status.toLowerCase() === statusLower) {
        return res
          .status(400)
          .json({ message: `Order already in status ${status}` });
      }

      // ========= VALIDATION FOR NEXT STATUS =========
      if (lastStatus && !allowedNextStatus[lastStatus]?.includes(statusLower)) {
        return res.status(400).json({
          message: `Invalid status from '${lastStatus}' to '${statusLower}'`,
        });
      }

      // ========= CHECK TRACKING NUMBER =========
      const checkTrackNumber = `
      SELECT tracking_number 
      FROM shipping_history
      WHERE order_id = ?
      AND tracking_number IS NOT NULL
      ORDER BY created_at ASC
      LIMIT 1`;

      const [existingTrackNumber] = await runQuery(checkTrackNumber, [
        order_id,
      ]);
      const tracking_number =
        existingTrackNumber && existingTrackNumber.tracking_number
          ? existingTrackNumber.tracking_number
          : statusLower === "received"
          ? null
          : `TRK-${date}`;

      console.log("TRACKING NUMBER: ", tracking_number);

      // ========= INSERT INTO SHIPPING HISTORY =========
      await runQuery(
        `INSERT INTO shipping_history 
        (order_id, courier, tracking_number, status, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [order_id, courier, tracking_number, status, date, date]
      );

      res.status(201).json({
        message: existingTrackNumber
          ? "Update success"
          : "Shipping history added",
        tracking_number,
      });
    } catch (err) {
      console.error("Add shipping history error:", err);
      res.status(500).json({ message: "Failed to add shipping history" });
    }
  },

  getShippingHistory: async (req, res) => {
    const { order_id } = req.params;

    try {
      // ========= GET STATUS, TRACK NUMBER, DATE =========
      const getStatusOrder = `
      SELECT status, tracking_number, created_at
      FROM shipping_history
      WHERE order_id = ?
      ORDER BY created_at ASC`;

      const statusResult = await runQuery(getStatusOrder, [order_id]);
      console.log("STATUS RESULT: ", statusResult);

      if (statusResult.length === 0) {
        return res.status(400).json({ message: "No shipping history found" });
      }

      res.status(200).json({ result: statusResult });
    } catch (err) {
      console.log("Get shipping history error: ", err);
      res.status(500).json({ message: "Failed to get shipping history" });
    }
  },
};
