const midtransClient = require("midtrans-client");
const axios = require("axios");

let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

const createTransaction = async ({
  order_id,
  cartItems,
  shippingCost,
  user,
}) => {
  const items = [
    ...cartItems.map((item) => ({
      id: item.product_id,
      name: item.product_name,
      price: Number(item.price),
      quantity: item.quantity,
    })),
    {
      id: "shc",
      name: "Shipping Cost",
      price: Number(shippingCost?.cost),
      quantity: 1,
    },
  ];

  const total_amount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  let parameter = {
    transaction_details: {
      order_id: `ORDER-${order_id}`,
      gross_amount: Number(total_amount),
    },
    credit_card: {
      secure: true,
    },
    customer_details: {
      first_name: user.name,
      email: user.email,
      phone: user.phone_number || null,
      address: user.address || "-",
    },
    shipping_address: {
      first_name: user.name,
      email: user.email,
      phone: user.phone_number || null,
      billing_address: {
        address: user.address,
      },
    },
    item_details: items,
  };

  return snap.createTransaction(parameter);
};

// const refundTransaction = async (transactionId, amount) => {
//   try {
//     const refundKey = `REFUND-${transactionId}-${Date.now()}`;
//     const serverKey = process.env.MIDTRANS_SERVER_KEY;
//     const url = `https://api.sandbox.midtrans.com/v2/${transactionId}/refund`;

//     const response = await axios.post(
//       url,
//       { refundKey, refund_amount: amount, reason: "User cancel order" },
//       {
//         auth: {
//           username: serverKey,
//           password: "",
//         },
//       }
//     );

//     return response.data;
//   } catch (error) {
//     console.error(
//       "Midtrans Refund Error:",
//       error.response?.data || error.message
//     );
//     throw new Error("Refund failed");
//   }
// };

module.exports = { createTransaction };
