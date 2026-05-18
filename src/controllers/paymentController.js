const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    const err = new Error('Razorpay keys are missing (RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)');
    err.statusCode = 500;
    throw err;
  }
  return new Razorpay({ key_id, key_secret });
};

// @desc    Create Razorpay order for an existing DS order
// @route   POST /api/payments/razorpay/order
// @access  Private
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    res.status(400);
    throw new Error('orderId is required');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  if (order.isPaid) {
    res.status(400);
    throw new Error('Order already paid');
  }
  if (!['Card', 'UPI'].includes(order.paymentMethod)) {
    res.status(400);
    throw new Error('Razorpay is only allowed for Card/UPI');
  }

  const razorpay = getRazorpayInstance();

  // Razorpay amount is in paise
  const amount = Math.round(Number(order.totalPrice) * 100);
  let rpOrder;
  try {
    rpOrder = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `ds_${order._id.toString()}`,
      notes: { dsOrderId: order._id.toString() },
    });
  } catch (e) {
    const details =
      e?.error?.description ||
      e?.error?.message ||
      e?.message ||
      'Unable to create Razorpay order';
    res.status(500);
    throw new Error(details);
  }

  res.json({
    success: true,
    keyId: process.env.RAZORPAY_KEY_ID,
    razorpayOrder: rpOrder,
    amount,
    currency: 'INR',
  });
});

// @desc    Verify Razorpay payment and mark order paid
// @route   POST /api/payments/razorpay/verify
// @access  Private
const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400);
    throw new Error('Missing required Razorpay fields');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  if (order.isPaid) {
    if (['Card', 'UPI'].includes(order.paymentMethod) && order.status === 'Pending') {
      order.status = 'Complete';
      await order.save();
    }
    return res.json({ success: true, order });
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expected !== razorpay_signature) {
    res.status(400);
    throw new Error('Payment verification failed');
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.status = 'Complete';
  order.paymentResult = {
    provider: 'razorpay',
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  };

  const updated = await order.save();
  res.json({ success: true, order: updated });
});

module.exports = { createRazorpayOrder, verifyRazorpayPayment };

