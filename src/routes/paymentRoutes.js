const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createStripeCheckoutSession,
  verifyStripeSession,
  getStripeSession, // ← NEW
} = require("../controllers/stripeController");

// Stripe routes
router.post("/stripe/session", protect, createStripeCheckoutSession);
router.post("/stripe/verify", protect, verifyStripeSession);
router.get("/stripe/session/:sessionId", protect, getStripeSession); // ← NEW

module.exports = router;
