const express = require("express");
const contactController = require("../controllers/contactController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, roleMiddleware("ADMIN", "ACCOUNTANT"));

router.get("/", contactController.list);
router.get("/:id", contactController.getById);
router.post("/", contactController.create);
router.put("/:id", contactController.update);
router.delete("/:id", contactController.archive);

module.exports = router;
