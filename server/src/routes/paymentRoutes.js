import express from "express";
import {
  createPayment,
  getPayments,
  getPaymentById,
} from "../controllers/paymentController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "ACCOUNTANT"));

router.post("/", createPayment);
router.get("/", getPayments);
router.get("/:id", getPaymentById);

export default router;