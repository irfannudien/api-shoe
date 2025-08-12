const axios = require("axios");

const getProvinceByCityName = async (cityName) => {
  try {
    const provinceRes = await axios.get(
      "https://rajaongkir.komerce.id/api/v1/destination/province",
      {
        headers: { key: process.env.RAJAONGKIR_API_KEY },
      }
    );
    console.log("PROVICE RESPONSE: ", provinceRes.data);
    const provinces = provinceRes.data.data;

    const cityReq = await Promise.all(
      provinces.map(async (prov) => {
        try {
          // ========= GET ALL CITY SUITABLE PROVINCE =========
          const cityRes = await axios.get(
            `https://rajaongkir.komerce.id/api/v1/destination/city/${prov.id}`,
            {
              headers: { key: process.env.RAJAONGKIR_API_KEY },
            }
          );
          console.log("CITY RESPONSE: ", cityRes.data);

          // ========= FIND CITY =========
          const getCity = cityRes.data.data.find((c) =>
            c.name.toLowerCase().includes(cityName.toLowerCase())
          );

          if (getCity) {
            return {
              province: prov.name,
              province_id: prov.id,
              city: getCity.name,
              city_id: getCity.id,
            };
          }

          return null;
        } catch (err) {
          return null;
        }
      })
    );

    console.log("CITY REQUEST: ", cityReq);

    const result = cityReq.find((res) => res !== null);
    return result || null;
  } catch (err) {
    console.error("Error fetching city:", err.message);
    return null;
  }
};

const getShippingCost = async ({
  origin,
  userCityName,
  weight,
  courier,
  service,
}) => {
  try {
    const location = await getProvinceByCityName(userCityName);
    if (!location) throw new Error("Province or City not found");
    console.log("LOCATION: ", location);

    const destination = location.city_id;

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
    console.log("COST RESPONSE: ", response);

    // ========= FIND COURIER SERVICE =========
    const selectedService = response.data.data.find(
      (item) => item.service === service
    );
    if (!selectedService) return null;

    return {
      courier: selectedService.name,
      service: selectedService.service,
      cost: selectedService.cost,
      etd: selectedService.etd,
      province: location.province,
      city: location.city,
    };
  } catch (err) {
    console.error("Error fetching cost:", err.response?.data || err.message);
    return null;
  }
};

module.exports = getShippingCost;
