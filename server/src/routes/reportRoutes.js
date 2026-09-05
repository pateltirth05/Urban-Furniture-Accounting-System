const express = require("express");
const reportController = require("../controllers/reportController");
const balanceSheetController = require("../controllers/balanceSheetController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, roleMiddleware("ADMIN", "ACCOUNTANT"));

router.get("/dashboard-summary", reportController.getDashboardSummary);
router.get("/profit-and-loss", reportController.getProfitAndLoss);
router.get("/balance-sheet", balanceSheetController.getBalanceSheet);

module.exports = router;
