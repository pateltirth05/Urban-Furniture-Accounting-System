import express from "express";

import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/productCategoryController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  createCategory
);

router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  getCategories
);

router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  getCategoryById
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  updateCategory
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  deleteCategory
);

export default router;