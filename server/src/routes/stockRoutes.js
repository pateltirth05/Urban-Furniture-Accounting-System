import express from "express";

import {
  getStockReport,
  getStockMovements,
} from "../controllers/stockController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "ACCOUNTANT"));

router.get("/report", getStockReport);
router.get("/movements", getStockMovements);

export default router;