const express = require("express");
const controller = require("../controllers/vendorBillController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, roleMiddleware("ADMIN", "ACCOUNTANT"));

router.get("/", controller.list);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.post("/:id/confirm", controller.confirmBill);
router.post("/:id/cancel", controller.cancelBill);

module.exports = router;
