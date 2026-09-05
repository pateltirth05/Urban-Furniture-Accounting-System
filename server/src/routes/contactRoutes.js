import express from "express";
import {
  createContact,
  getContacts,
} from "../controllers/contactController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  createContact
);

router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  getContacts
);

export default router;