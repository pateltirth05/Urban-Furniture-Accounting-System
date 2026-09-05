import express from "express";

import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
} from "../controllers/purchaseOrderController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  createPurchaseOrder
);

router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  getPurchaseOrders
);

router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  getPurchaseOrderById
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  updatePurchaseOrder
);

router.post(
  "/:id/confirm",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  confirmPurchaseOrder
);

router.post(
  "/:id/cancel",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  cancelPurchaseOrder
);

export default router;