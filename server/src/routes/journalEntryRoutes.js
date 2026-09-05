import express from "express";

import {
  createJournalEntry,
  getJournalEntries,
  getJournalEntryById,
  postJournalEntry,
  cancelJournalEntry,
} from "../controllers/journalEntryController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  createJournalEntry
);

router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  getJournalEntries
);

router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  getJournalEntryById
);

router.post(
  "/:id/post",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  postJournalEntry
);

router.post(
  "/:id/cancel",
  authMiddleware,
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  cancelJournalEntry
);

export default router;