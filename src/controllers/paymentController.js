const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createStripeCheckoutSession,
  verifyStripeSession,
} = require("../controllers/stripeController");

// Stripe only
router.post("/stripe/session", protect, createStripeCheckoutSession);
router.post("/stripe/verify", protect, verifyStripeSession);

module.exports = router;
