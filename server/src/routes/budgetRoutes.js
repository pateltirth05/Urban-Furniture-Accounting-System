const express = require("express");
const controller = require("../controllers/budgetController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, roleMiddleware("ADMIN", "ACCOUNTANT"));

router.get("/", controller.list);
router.get("/:id", controller.getById);
router.get("/:id/report", controller.getReport);
router.post("/", controller.create);
router.post("/:id/confirm", controller.confirmBudget);

module.exports = router;
