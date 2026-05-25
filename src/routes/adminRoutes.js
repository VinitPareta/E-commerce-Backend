const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getAdminPayments,
  getWebhookEvents,
  invalidateWebhookCache,
} = require("../controllers/adminController");
const { protect, admin } = require("../middleware/authMiddleware");

router.get("/stats", protect, admin, getDashboardStats);
router.get("/payments", protect, admin, getAdminPayments);
router.get("/webhook-events", protect, admin, getWebhookEvents);

// Manual cache refresh — hit this when you want fresh Stripe data immediately
router.post("/webhook-events/refresh", protect, admin, (req, res) => {
  invalidateWebhookCache();
  res.json({
    success: true,
    message: "Cache cleared. Next load will fetch fresh data.",
  });
});

module.exports = router;
