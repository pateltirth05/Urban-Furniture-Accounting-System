import express from "express";

import {
  createAnalyticAccount,
  getAnalyticAccounts,
  getAnalyticAccountById,
  updateAnalyticAccount,
  archiveAnalyticAccount,
} from "../controllers/analyticAccountController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "ACCOUNTANT"));

router.post("/", createAnalyticAccount);
router.get("/", getAnalyticAccounts);
router.get("/:id", getAnalyticAccountById);
router.put("/:id", updateAnalyticAccount);
router.delete("/:id", archiveAnalyticAccount);

export default router;