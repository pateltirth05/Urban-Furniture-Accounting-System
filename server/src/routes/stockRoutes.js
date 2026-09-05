const express = require("express");
const controller = require("../controllers/stockController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, roleMiddleware("ADMIN", "ACCOUNTANT"));

router.get("/report", controller.getStockReport);
router.get("/movements", controller.getMovements);
router.get("/", controller.getStockReport);

module.exports = router;
