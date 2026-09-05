const { query } = require("../config/db");

async function list(req, res) {
  try {
    const result = await query("SELECT * FROM product_categories ORDER BY name ASC");
    return res.json({ data: result.rows });
  } catch (err) {
    console.error("productCategories.list error", err);
    return res.status(500).json({ message: "Failed to list product categories" });
  }
}

async function getById(req, res) {
  try {
    const result = await query("SELECT * FROM product_categories WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("productCategories.getById error", err);
    return res.status(500).json({ message: "Failed to load product category" });
  }
}

async function create(req, res) {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Category name is required" });
  }

  try {
    const result = await query(
      "INSERT INTO product_categories (name) VALUES ($1) RETURNING *",
      [name.trim()]
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Category with this name already exists" });
    }
    console.error("productCategories.create error", err);
    return res.status(500).json({ message: "Failed to create category" });
  }
}

async function update(req, res) {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Category name is required" });
  }

  try {
    const result = await query(
      "UPDATE product_categories SET name = $1 WHERE id = $2 RETURNING *",
      [name.trim(), req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Category with this name already exists" });
    }
    console.error("productCategories.update error", err);
    return res.status(500).json({ message: "Failed to update category" });
  }
}

async function remove(req, res) {
  try {
    const checkProducts = await query(
      "SELECT id FROM products WHERE category_id = $1 LIMIT 1",
      [req.params.id]
    );
    if (checkProducts.rows.length > 0) {
      return res.status(400).json({ message: "Cannot delete category linked to products" });
    }

    const result = await query("DELETE FROM product_categories WHERE id = $1 RETURNING id", [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("productCategories.remove error", err);
    return res.status(500).json({ message: "Failed to delete category" });
  }
}

module.exports = { list, getById, create, update, remove };
