const axios = require("axios");

module.exports = {
  getProvince: async (req, res) => {
    try {
      const response = await axios.get(
        "https://rajaongkir.komerce.id/api/v1/destination/province",
        {
          headers: { key: process.env.RAJAONGKIR_API_KEY },
        }
      );

      res.status(200).send(response.data.data);
    } catch (err) {
      console.error("Error fetching provinces:", err);
      res.status(500).send("Internal server error");
    }
  },
  getCity: async (req, res) => {
    const { province_id } = req.params;

    try {
      const response = await axios.get(
        `https://rajaongkir.komerce.id/api/v1/destination/city/${province_id}`,
        {
          headers: { key: process.env.RAJAONGKIR_API_KEY },
        }
      );

      res.status(200).send(response.data.data);
    } catch (err) {
      console.error("Error fetching provinces:", err);
      res.status(500).send("Internal server error");
    }
  },
};
