const express = require("express");
const controller = require("../controllers/exportController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/invoices/:id/pdf",
  roleMiddleware("ADMIN", "ACCOUNTANT", "CONTACT"),
  controller.exportInvoicePdf
);

router.get(
  "/csv/:entity",
  roleMiddleware("ADMIN", "ACCOUNTANT"),
  controller.exportCsv
);

module.exports = router;