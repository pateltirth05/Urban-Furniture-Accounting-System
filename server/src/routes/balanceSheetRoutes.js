import express from "express";

import {
  getProfitAndLoss,
} from "../controllers/reportController.js";

import {
  getBalanceSheet,
} from "../controllers/balanceSheetController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "ACCOUNTANT"));

router.get(
  "/profit-and-loss",
  getProfitAndLoss
);

router.get(
  "/balance-sheet",
  getBalanceSheet
);

export default router;