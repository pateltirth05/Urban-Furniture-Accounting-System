const express = require("express");
const controller = require("../controllers/journalEntryController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, roleMiddleware("ADMIN", "ACCOUNTANT"));

router.get("/", controller.list);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.post("/:id/post", controller.postEntry);
router.post("/:id/cancel", controller.cancelEntry);

module.exports = router;
