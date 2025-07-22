const {
  runQuery,
  validateProductSeo,
  validateCategorySeo,
} = require("../../utils");

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-+/g, "-");
}

module.exports = {
  addProduct: async (req, res) => {
    const date = new Date();
    const { product, new_category, images, sizes, product_seo, category_seo } =
      req.body;

    // ========= BODY VALIDATION =========
    if (!product || !images || !sizes || !product_seo) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (
      !product.product_name?.trim() ||
      product.price == null ||
      !String(product.description).trim() ||
      !product.brand?.trim() ||
      product.weight == null
    ) {
      return res
        .status(400)
        .json({ message: "All product fields must be filled" });
    }

    if (isNaN(product.price) || product.price <= 0) {
      return res
        .status(400)
        .json({ message: "Price must be a valid number > 0" });
    }

    if (isNaN(product.weight) || product.weight <= 0) {
      return res
        .status(400)
        .json({ message: "Weight must be a valid number > 0" });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: "At least 1 image is required" });
    }

    // ========= SIZE VALIDATION =========
    if (!Array.isArray(sizes) || sizes.length === 0) {
      return res
        .status(400)
        .json({ message: "At least 1 size with stock is required" });
    }

    const isInvalidSize = sizes.some((item) => {
      return !item.size_id || isNaN(item.stock) || Number(item.stock) <= 0;
    });

    if (isInvalidSize) {
      return res.status(400).json({
        message: "Each size_id and stock must be valid and stock > 0",
      });
    }

    if (validateProductSeo(product_seo)) {
      return res.status(400).json({
        message: "Product SEO invalid!",
      });
    }

    try {
      console.log("PRODUCT DATA", product);
      console.log("IMAGES DATA", images);
      console.log("SIZES DATA", sizes);
      console.log("SEO DATA", product_seo);
      console.log("SEO DATA", category_seo);
      console.log("NEW CATEGORY", new_category);

      // ========= START TRANSACTION =========
      await runQuery("START TRANSACTION");

      // ========= CATEGORY VALIDATION =========
      let categoryLabel;

      if (
        new_category &&
        typeof new_category === "object" &&
        typeof new_category.category === "string" &&
        new_category.category.trim()
      ) {
        if (validateCategorySeo(category_seo)) {
          return res.status(400).json({ message: "Category SEO invalid!" });
        }
        const newCategory = new_category.category.trim();

        const isInvalidCategory =
          newCategory.length < 2 ||
          newCategory.length > 10 ||
          ["null", "undefined", "none", "invalid"].includes(
            newCategory.toLowerCase()
          ) ||
          /^[0-9]+$/.test(newCategory) ||
          !/^[a-zA-Z\s\-&()]+$/.test(newCategory);

        if (isInvalidCategory) {
          return res.status(400).json({ message: "Invalid new category name" });
        }

        const checkCategory = `
        SELECT id FROM product_category
        WHERE category = ?`;
        const existingCategory = await runQuery(checkCategory, [newCategory]);

        if (existingCategory.length > 0) {
          return res.status(400).json({ message: "Category already exist" });
        }

        // ========= INSERT CATEGORY =========
        const insertProductCategory = `
        INSERT INTO product_category (category, description, slug, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)`;
        const valueCategory = [
          newCategory,
          newCategory.description || null,
          newCategory.slug || generateSlug(newCategory),
          date,
          date,
        ];
        const insertCategoryResult = await runQuery(
          insertProductCategory,
          valueCategory
        );

        console.log("INSERT NEW CATEGORY RESULT: ", insertCategoryResult);
        const newCategoryId = insertCategoryResult.insertId;
        console.log("NEW CATEGORY ID: ", newCategoryId);

        // ========= INSERT CATEGORY SEO =========
        const insertCategorySeo = `
        INSERT INTO product_category_seo
        (product_category_id, category_title, meta_title, meta_keyword, meta_descriptions, meta_image, meta_image_alt, meta_author, meta_type, meta_url, page_favicon, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )
        `;

        const categorySeoValues = [
          newCategoryId,
          category_seo.category_title,
          category_seo.meta_title?.trim() || category_seo.category_title,
          category_seo.meta_keyword,
          category_seo.meta_descriptions,
          category_seo.meta_image,
          category_seo.meta_image_alt?.trim() || category_seo.meta_image,
          category_seo.meta_author?.trim() || category_seo.meta_image,
          category_seo.meta_type?.trim() || category_seo.meta_image,
          category_seo.meta_url?.trim() || category_seo.meta_image,
          category_seo.page_favicon?.trim() || category_seo.meta_image,
          date,
          date,
        ];

        await runQuery(insertCategorySeo, categorySeoValues);

        categoryLabel = newCategory;
      } else if (product.category) {
        const inputCategory = String(product.category).trim();

        const isNotNumber = isNaN(Number(inputCategory));

        if (isNotNumber) {
          const checkCategoryByName = `
          SELECT category FROM product_category
          WHERE category = ?`;
          const categoryNameExist = await runQuery(
            checkCategoryByName,
            inputCategory
          );

          if (categoryNameExist.length === 0) {
            return res.status(400).json({ message: "Category name not found" });
          }
          console.log("EXISTING CATEGORY BY NAME:", inputCategory);

          categoryLabel = inputCategory;
        } else {
          const categoryId = Number(inputCategory);
          const checkCategoryById = `SELECT category FROM product_category
          WHERE id = ?`;
          const categoryIdExist = await runQuery(checkCategoryById, [
            categoryId,
          ]);

          if (categoryIdExist.length === 0) {
            return res.status(400).json({ message: "Category ID not found" });
          }

          console.log("EXISTING CATEGORY BY ID: ", categoryIdExist);
          categoryLabel = categoryIdExist[0].category;
        }
      } else {
        return res.status(400).json({ message: "Category is required" });
      }

      // ========= PRODUCT VALIDATION =========
      const productName = product.product_name.trim();
      const productPrice = parseInt(product.price);
      const slug = generateSlug(product.product_name);
      const featuredImage = product.featured_image || images[0];

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
        return res.status(400).json({ message: "Product already exist" });
      }

      // ========= INSERT NEW PRODUCT =========
      const insertNewProduct = `
      INSERT INTO product
      (product_name, price, description, brand, category, weight, featured_image, slug, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const productValues = [
        productName,
        productPrice,
        product.description,
        product.brand,
        categoryLabel,
        product.weight,
        featuredImage,
        slug,
        date,
        date,
      ];

      const productResult = await runQuery(insertNewProduct, productValues);
      console.log("NEW PRODUCT RESULT: ", productResult);
      const productId = productResult.insertId;
      console.log("NEW PRODUCT ID: ", productId);

      // ========= INSERT PRODUCT IMAGE =========
      const insertProductImage = `
      INSERT INTO product_img
      (product_id, assets, created_at, updated_at)
      VALUES (?, ?, ?, ?)`;

      const imageResult = images.map((img) => {
        const imgValues = [productId, img, date, date];
        return runQuery(insertProductImage, imgValues);
      });
      await Promise.all(imageResult);
      console.log("IMAGES RESULT: ", imageResult);

      // ========= INSERT PRODUCT SIZE and STOCK =========

      const insertProductSize = `
      INSERT INTO product_stock
      (product_id, size_id, stock, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)`;
      const sizeResult = sizes.map(({ size_id, stock }) => {
        const sizeValues = [productId, size_id, stock, date, date];
        return runQuery(insertProductSize, sizeValues);
      });
      await Promise.all(sizeResult);
      console.log("SIZE AND STOCK RESULT: ", sizeResult);

      // ========= INSERT PRODUCT SEO =========
      const insertProductSeo = `
      INSERT INTO product_seo
      (product_id, product_title, meta_title, meta_keyword, meta_description, meta_image, meta_image_alt, meta_author, meta_type, meta_url, page_favicon, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const productSeoValues = [
        productId,
        product_seo.product_title,
        product_seo.meta_title?.trim() || product_seo.product_title,
        product_seo.meta_keyword?.trim() || product_seo.product_title,
        product_seo.meta_description,
        product_seo.meta_image,
        product_seo.meta_image_alt?.trim() || product_seo.product_title,
        product_seo.meta_author,
        product_seo.meta_type,
        product_seo.meta_url,
        product_seo.page_favicon,
        date,
        date,
      ];

      const insertSeoResult = await runQuery(
        insertProductSeo,
        productSeoValues
      );
      console.log("PRODUCT SEO INSERT: ", insertSeoResult);

      // ========= FINISH TRANSACTION =========
      await runQuery("COMMIT");

      console.log("INSERT NEW PRODUCT SUCCESS");
      res.status(201).json({ message: "Insert new product success" });
    } catch (err) {
      await runQuery("ROLLBACK");
      console.log("ERROR MESSAGE: ", err);
      res.status(500).json({ message: "Internal server error" });
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
