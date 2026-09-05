import express from "express";

import {
  createSalesOrder,
  getSalesOrders,
  getSalesOrderById,
  updateSalesOrder,
  confirmSalesOrder,
  cancelSalesOrder,
} from "../controllers/salesOrderController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "ACCOUNTANT"));

router.post("/", createSalesOrder);
router.get("/", getSalesOrders);
router.get("/:id", getSalesOrderById);
router.put("/:id", updateSalesOrder);
router.post("/:id/confirm", confirmSalesOrder);
router.post("/:id/cancel", cancelSalesOrder);

export default router;