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

      console.log("DATA PROVINCE: ", response.data.data);
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
      console.log("DATA CITY: ", response.data.data);
      res.status(200).send(response.data.data);
    } catch (err) {
      console.error("Error fetching provinces:", err);
      res.status(500).send("Internal server error");
    }
  },

  getCost: async (req, res) => {
    const { origin, destination, weight, courier, service } = req.body;

    if (!origin || !destination || !weight || !courier) {
      return res.status(400).json({
        message:
          "All fields are required: origin, destination, weight, courier",
      });
    }

    try {
      const query = new URLSearchParams({
        origin,
        destination,
        weight,
        courier,
      });

      const response = await axios.post(
        "https://rajaongkir.komerce.id/api/v1/calculate/district/domestic-cost",
        query.toString(),
        {
          headers: {
            key: process.env.RAJAONGKIR_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      console.log("RESPONSE DATA: ", response.data);

      const selectedService = response.data.data.find(
        (item) => item.service === service
      );

      if (!selectedService) {
        return null;
      }

      res.status(200).json({
        courier: selectedService.name,
        service: selectedService.service,
        cost: selectedService.cost,
        etd: selectedService.etd,
      });
    } catch (err) {
      console.error("Error fetching cost:", err.response?.data || err.message);
      res.status(500).send("Internal server error");
    }
  },
};
