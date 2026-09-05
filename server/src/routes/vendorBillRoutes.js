import express from "express";

import {
  createVendorBill,
  getVendorBills,
  getVendorBillById,
  updateVendorBill,
  confirmVendorBill,
  cancelVendorBill,
} from "../controllers/vendorBillController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  createVendorBill
);

router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  getVendorBills
);

router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  getVendorBillById
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  updateVendorBill
);

router.post(
  "/:id/confirm",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  confirmVendorBill
);

router.post(
  "/:id/cancel",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  cancelVendorBill
);

export default router;