import express from "express";

import {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  archiveAccount,
} from "../controllers/chartOfAccountController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  createAccount
);

router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  getAccounts
);

router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  getAccountById
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  updateAccount
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  archiveAccount
);

export default router;