const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controllers/adminController");
const { protect, admin } = require("../middleware/authMiddleware");
const { getAdminPayments } = require("../controllers/adminController");

router.get("/stats", protect, admin, getDashboardStats);
// Add this line with your other admin routes (protect + admin middleware)
router.get("/payments", protect, admin, getAdminPayments);

module.exports = router;
