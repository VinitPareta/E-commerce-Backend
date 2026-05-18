const asyncHandler = require("express-async-handler");
const Stripe = require("stripe");
const Order = require("../models/Order");

const getStripe = () => {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    const err = new Error("Stripe secret key is missing (STRIPE_SECRET_KEY)");
    err.statusCode = 500;
    throw err;
  }
  return new Stripe(secret);
};

const getClientOrigin = (req) => {
  // Prefer explicit CLIENT_URL, fall back to request origin
  return (
    process.env.CLIENT_URL || req.headers.origin || "http://localhost:5173"
  );
};

// @desc    Create Stripe Checkout Session for an existing DS order
// @route   POST /api/payments/stripe/session
// @access  Private
const createStripeCheckoutSession = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    res.status(400);
    throw new Error("orderId is required");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }
  if (order.isPaid) {
    res.status(400);
    throw new Error("Order already paid");
  }
  if (!["Card", "UPI"].includes(order.paymentMethod)) {
    res.status(400);
    throw new Error("Stripe is only allowed for Card/UPI");
  }

  const stripe = getStripe();
  const origin = getClientOrigin(req);

  const payment_method_types =
    order.paymentMethod === "UPI" ? ["upi"] : ["card"];

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types,
      client_reference_id: order._id.toString(),
      metadata: { dsOrderId: order._id.toString() },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "inr",
            unit_amount: Math.round(Number(order.totalPrice) * 100),
            product_data: {
              name: `DS Store Order ${order._id.toString().slice(-8).toUpperCase()}`,
            },
          },
        },
      ],
      success_url: `${origin}/orders?stripe_order_id=${order._id.toString()}&stripe_session_id={CHECKOUT_SESSION_ID}`, //with order id and session id
      cancel_url: `${origin}/orders/${order._id.toString()}?stripe_cancelled=1`,
    });
  } catch (e) {
    const msg =
      e?.raw?.message || e?.message || "Unable to create Stripe session";
    res.status(500);
    throw new Error(msg);
  }

  res.json({ success: true, url: session.url, sessionId: session.id });
});

// @desc    Verify Stripe session and mark order paid
// @route   POST /api/payments/stripe/verify
// @access  Private
const verifyStripeSession = asyncHandler(async (req, res) => {
  const { orderId, sessionId } = req.body;
  if (!orderId || !sessionId) {
    res.status(400);
    throw new Error("orderId and sessionId are required");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }
  if (order.isPaid) {
    if (
      ["Card", "UPI"].includes(order.paymentMethod) &&
      order.status === "Pending"
    ) {
      order.status = "Complete";
      await order.save();
    }
    return res.json({ success: true, order });
  }

  const stripe = getStripe();

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (e) {
    const msg =
      e?.raw?.message || e?.message || "Unable to verify Stripe session";
    res.status(400);
    throw new Error(msg);
  }

  const dsOrderId =
    session?.metadata?.dsOrderId || session?.client_reference_id;
  if (dsOrderId !== order._id.toString()) {
    res.status(400);
    throw new Error("Stripe session does not match this order");
  }
  if (session.payment_status !== "paid") {
    res.status(400);
    throw new Error("Payment not completed");
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.status = "Complete";
  order.paymentResult = {
    provider: "stripe",
    orderId: session.payment_intent || session.id,
    paymentId: session.payment_intent || "",
    signature: "",
  };

  const updated = await order.save();
  res.json({ success: true, order: updated });
});

module.exports = { createStripeCheckoutSession, verifyStripeSession };
