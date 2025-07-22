const axios = require("axios");

module.exports = {
  // getNews: async (req, res) => {
  //

  //   try {
  //     const response = await axios.get("https://newsapi.org/v2/everything", {
  //       params: {
  //         q,
  //         from,
  //         sortBy,
  //         pageSize,
  //         apiKey: process.env.NEWS_API_KEY,
  //       },
  //     });

  //     const result = response.data.articles;
  //     console.log("RESPONSE", result);
  //     res.status(200).json(result);
  //   } catch (err) {
  //     console.log(err);
  //     res.status(500).json({ message: "Failed to fetch news data" });
  //   }
  // },

  getNews: async (req, res) => {
    const { type, country, q, from, to, sortBy, pageSize } = req.query;

    const params =
      type === "everything"
        ? { q, from, to, sortBy, pageSize, apiKey: process.env.NEWS_API_KEY }
        : { country, q, pageSize, apiKey: process.env.NEWS_API_KEY };

    const endpoint =
      type === "everything"
        ? "https://newsapi.org/v2/everything"
        : "https://newsapi.org/v2/top-headlines";

    try {
      const response = await axios.get(endpoint, { params });

      const result = response.data;
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
