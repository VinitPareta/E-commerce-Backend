const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require('../controllers/paymentController');
const {
  createStripeCheckoutSession,
  verifyStripeSession,
} = require('../controllers/stripeController');

router.post('/razorpay/order', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyRazorpayPayment);

router.post('/stripe/session', protect, createStripeCheckoutSession);
router.post('/stripe/verify', protect, verifyStripeSession);

module.exports = router;

