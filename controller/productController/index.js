const { runQuery } = require("../../utils");

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-+/g, "-");
}

module.exports = {
  insertProduct: async (req, res) => {
    const date = new Date();
    const { product, images, sizes, seo } = req.body;

    // ========= BODY VALIDATION =========
    if (!product || !images || !sizes || !seo) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res
        .status(400)
        .json({ message: "Minimum 1 image is required for the product." });
    }

    try {
      console.log("YOUR INSERT PRODUCT");
      console.log("PRODUCT DATA", product);
      console.log("IMAGES DATA", images);
      console.log("SIZES DATA", sizes);
      console.log("SEO DATA", seo);

      // ========= CATEGORY CHECK =========
      // ========= GET CATEGORY LABEL =========
      const getCategoryLabel = `
      SELECT category FROM product_category
      WHERE id = ?`;
      const categoryResult = await runQuery(getCategoryLabel, [
        product.category,
      ]);
      console.log("PRODUCT CATEGORY: ", categoryResult);

      if (categoryResult.length === 0) {
        return res.status(400).json({ message: "Invalid Category ID" });
      }

      const categoryLabel = categoryResult[0].category;
      console.log("CATEGORY LABEL: ", categoryLabel);

      // ========= START TRANSACTION =========
      await runQuery("START TRANSACTION");

      const featuredImage = product.featured_image || images[0];
      const slug = generateSlug(product.product_name);
      const productName = product.product_name.trim();
      const productPrice = parseInt(product.price);

      if (isNaN(productPrice) || productPrice <= 0) {
        return res
          .status(400)
          .json({ message: "Price must be a valid positive number" });
      }

      const productValidation = `
      SELECT id FROM product
      WHERE product_name = ? OR slug = ?`;
      const existingProduct = await runQuery(productValidation, [
        productName,
        slug,
      ]);

      console.log("EXISTING PRODUCT: ", existingProduct);
      if (existingProduct.length > 0) {
        return res.status(400).json({ message: "Product already exists" });
      }

      // ========= INSERT NEW PRODUCT =========
      const insertNewProduct = `
      INSERT INTO product
      (product_name, price, description, brand, category, weight, featured_image, slug, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const productValues = [
        productName,
        productPrice,
        product.description,
        product.brand,
        product.category,
        product.weight,
        featuredImage,
        slug,
        date,
        date,
      ];

      const productResult = await runQuery(insertNewProduct, productValues);
      console.log("PRODUCT RESULT: ", productResult);
      const productId = productResult.insertId;
      console.log("PRODUCT INSERTED ID:", productId);

      // ========= INSERT PRODUCT IMAGE =========
      const insertImage = `
      INSERT INTO product_img
      (product_id, assets, created_at)
      VALUES (?, ?, ?)`;
      const imageResult = images.map((img) =>
        runQuery(insertImage, [productId, img, date])
      );
      await Promise.all(imageResult);
      console.log(`IMAGES RESULT: `, imageResult);

      // ========= INSERT PRODUCT STOCK and SIZE =========
      const insertStock = `
      INSERT INTO product_stock
      (product_id, size_id, stock, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)`;
      const stockResult = sizes.map(({ size_id, stock }) => {
        const stockValues = [productId, size_id, stock, date, date];
        runQuery(insertStock, stockValues);
      });
      await Promise.all(stockResult);
      console.log(`STOCK INSERT: `, stockResult);

      // ========= INSERT PRODUCT SEO =========
      const insertProductSeo = `
      INSERT INTO product_seo
      (product_id, product_title, meta_title, meta_keyword, meta_description, meta_image, meta_image_alt, meta_author, meta_type, meta_url, page_favicon, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const seoValues = [
        productId,
        seo.product.title,
        seo.meta_title,
        seo.meta_keyword,
        seo.meta_description,
        seo.meta_image,
        seo.meta_image_alt,
        seo.meta_author,
        seo.meta_type,
        seo.meta_url,
        seo.page_favicon,
        date,
        date,
      ];

      const insertSeoResult = await runQuery(insertProductSeo, seoValues);
      console.log("PRODUCT SEO INSERT: ", insertSeoResult);

      // ========= FINISH TRANSACTION =========
      await runQuery("COMMIT");

      console.log("INSERT NEW PRODUCT SUCCESS");
      res.status(201).json({ message: "Insert new product success" });
    } catch (err) {
      await runQuery("ROLLBACK");
      console.error("INSERT FAILED:", err);
      res.status(500).json({ message: "Insert failed" });
    }
  },

  deleteProduct: async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    if (!id) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    try {
      // ========= CHECK PRODUCT =========
      const getProductId = `SELECT id, product_name FROM product WHERE id = ?`;
      const productResult = await runQuery(getProductId, [id]);
      console.log("PRODUCT RESULT: ", productResult);

      if (productResult.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      const productName = productResult[0].product_name;

      // ========= START TRANSACTION =========
      await runQuery("START TRANSACTION");

      await runQuery(`DELETE FROM product_seo WHERE product_id = ?`, [id]);
      await runQuery(`DELETE FROM product_stock WHERE product_id = ?`, [id]);
      await runQuery(`DELETE FROM product_img WHERE product_id = ?`, [id]);
      await runQuery(`DELETE FROM product WHERE id = ?`, [id]);

      // ========= FINISH TRANSACTION =========
      await runQuery("COMMIT");

      res
        .status(200)
        .json({ message: `Product "${productName}" deleted successfully` });
    } catch (err) {
      await runQuery("ROLLBACK");
      console.log("DELETE FAILED:", err);
      res.status(500).json({ message: "Delete failed" });
    }
  },
};
