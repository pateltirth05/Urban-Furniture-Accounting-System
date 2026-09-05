import express from "express";

import {
  createBudget,
  getBudgets,
  getBudgetById,
  getBudgetReport,
  updateBudget,
  confirmBudget,
  reviseBudget,
  cancelBudget,
} from "../controllers/budgetController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "ACCOUNTANT"));

router.post("/", createBudget);
router.get("/", getBudgets);
router.get("/:id", getBudgetById);
router.get("/:id/report", getBudgetReport);
router.put("/:id", updateBudget);
router.post("/:id/confirm", confirmBudget);
router.post("/:id/revise", reviseBudget);
router.post("/:id/cancel", cancelBudget);

export default router;