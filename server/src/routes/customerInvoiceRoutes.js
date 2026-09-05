import express from "express";

import {
  createCustomerInvoice,
  getCustomerInvoices,
  getCustomerInvoiceById,
  updateCustomerInvoice,
  confirmCustomerInvoice,
  cancelCustomerInvoice,
} from "../controllers/customerInvoiceController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "ACCOUNTANT"));

router.post("/", createCustomerInvoice);
router.get("/", getCustomerInvoices);
router.get("/:id", getCustomerInvoiceById);
router.put("/:id", updateCustomerInvoice);
router.post("/:id/confirm", confirmCustomerInvoice);
router.post("/:id/cancel", cancelCustomerInvoice);

export default router;