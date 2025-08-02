const midtransClient = require("midtrans-client");

let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

const createTransaction = async ({
  order_id,
  cartItems,
  shipping_cost,
  user,
}) => {
  const total_amount =
    cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) +
    Number(shipping_cost);

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
    item_details: [
      ...cartItems.map((item) => ({
        id: item.product_id,
        name: item.product_name,
        price: Number(item.price),
        quantity: item.quantity,
      })),
      {
        id: "shc",
        name: "Shipping Cost",
        price: Number(shipping_cost),
        quantity: 1,
      },
    ],
  };

  return snap.createTransaction(parameter);
};

module.exports = { createTransaction };
