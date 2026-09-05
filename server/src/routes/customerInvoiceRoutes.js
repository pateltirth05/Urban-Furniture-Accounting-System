const express = require("express");
const controller = require("../controllers/customerInvoiceController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

// CONTACT (Customer portal) and Staff (ADMIN, ACCOUNTANT) can view invoices
router.get("/", roleMiddleware("ADMIN", "ACCOUNTANT", "CONTACT"), controller.list);
router.get("/:id", roleMiddleware("ADMIN", "ACCOUNTANT", "CONTACT"), controller.getById);

// Only Staff can create/confirm/cancel invoices
router.post("/", roleMiddleware("ADMIN", "ACCOUNTANT"), controller.create);
router.post("/:id/confirm", roleMiddleware("ADMIN", "ACCOUNTANT"), controller.confirmInvoice);
router.post("/:id/cancel", roleMiddleware("ADMIN", "ACCOUNTANT"), controller.cancelInvoice);

module.exports = router;
