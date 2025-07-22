const db = require("../db");

module.exports = {
  runQuery: (query, params) => {
    return new Promise((resolve, reject) => {
      db.query(query, params, (err, result) => {
        if (err) {
          return reject(err);
        } else {
          return resolve(result);
        }
      });
    });
  },

  validateProductSeo: (seo) => {
    return (
      !seo.product_title?.trim() ||
      !seo.meta_description?.trim() ||
      !seo.meta_image?.trim() ||
      !seo.meta_url?.trim() ||
      !seo.meta_type?.trim() ||
      !seo.meta_author?.trim() ||
      !seo.page_favicon?.trim()
    );
  },

  validateCategorySeo: (seo) => {
    return (
      !seo.category_title?.trim() ||
      !seo.meta_keyword?.trim() ||
      !seo.meta_descriptions?.trim() ||
      !seo.meta_image?.trim()
    );
  },
};
