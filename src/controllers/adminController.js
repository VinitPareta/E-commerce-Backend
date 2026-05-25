const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");

// ─── Simple in-memory cache ────────────────────────────────
const cache = {
  webhookEvents: null,
  webhookEventsAt: 0,
  TTL: 2 * 60 * 1000, // 2 minutes
};

const isCacheValid = () =>
  cache.webhookEvents !== null &&
  Date.now() - cache.webhookEventsAt < cache.TTL;

// Call this whenever an order is updated so cache refreshes
const invalidateWebhookCache = () => {
  cache.webhookEvents = null;
  cache.webhookEventsAt = 0;
};

// ─── Dashboard Stats ───────────────────────────────────────
const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalProducts,
    totalOrders,
    totalUsers,
    revenueAgg,
    recentOrders,
    lowStock,
  ] = await Promise.all([
    Product.countDocuments(),
    Order.countDocuments(),
    User.countDocuments(),
    Order.aggregate([
      { $match: { status: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]),
    Order.find({})
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(5),
    Product.find({ stock: { $lte: 5 } }).limit(5),
  ]);

  const ordersByStatus = await Order.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  // Order Trend: last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const orderTrendRaw = await Order.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const trendMap = {};
  orderTrendRaw.forEach(({ _id, count }) => {
    const key = `${_id.year}-${_id.month}`;
    if (!trendMap[key]) {
      trendMap[key] = {
        month: monthNames[_id.month - 1],
        year: _id.year,
        monthNum: _id.month,
        total: 0,
        completed: 0,
        cancelled: 0,
      };
    }
    trendMap[key].total += count;
    if (_id.status === "Complete" || _id.status === "Delivered")
      trendMap[key].completed += count;
    if (_id.status === "Cancelled") trendMap[key].cancelled += count;
  });
  const orderTrend = Object.values(trendMap).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.monthNum - b.monthNum,
  );

  // Revenue Trend: last 6 months
  const revenueTrendRaw = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: sixMonthsAgo },
        status: { $ne: "Cancelled" },
      },
    },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        revenue: { $sum: "$totalPrice" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);
  const revenueTrend = revenueTrendRaw.map(({ _id, revenue }) => ({
    month: monthNames[_id.month - 1],
    revenue: Math.round(revenue),
  }));

  // Weekly Revenue: last 7 days
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7.push({
      date: d.toISOString().slice(0, 10),
      day: dayNames[d.getDay()],
      revenue: 0,
      orders: 0,
    });
  }
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const weeklyRaw = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: sevenDaysAgo },
        status: { $ne: "Cancelled" },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        },
        revenue: { $sum: "$totalPrice" },
        orders: { $sum: 1 },
      },
    },
  ]);
  weeklyRaw.forEach(({ _id, revenue, orders }) => {
    const slot = last7.find((d) => d.date === _id.date);
    if (slot) {
      slot.revenue = Math.round(revenue);
      slot.orders = orders;
    }
  });
  const weeklyRevenue = last7.map(({ day, revenue, orders }) => ({
    day,
    revenue,
    orders,
  }));

  // Payment Methods
  const paymentRaw = await Order.aggregate([
    { $group: { _id: "$paymentMethod", count: { $sum: 1 } } },
  ]);
  const totalTxns = paymentRaw.reduce((s, p) => s + p.count, 0);
  const colorMap = {
    COD: { color: "#fb923c", label: "Cash on Delivery" },
    Card: { color: "#6366f1", label: "Credit/Debit Card" },
    UPI: { color: "#22d3ee", label: "UPI" },
  };
  const paymentMethods = paymentRaw
    .map(({ _id, count }) => ({
      label: colorMap[_id]?.label || _id,
      value: count,
      percent:
        totalTxns > 0 ? parseFloat(((count / totalTxns) * 100).toFixed(1)) : 0,
      color: colorMap[_id]?.color || "#94a3b8",
    }))
    .sort((a, b) => b.value - a.value);

  // Order Status for gauge
  const statusColorMap = {
    Pending: "Pending",
    Complete: "Completed",
    Delivered: "Completed",
    Processing: "Processing",
    Shipped: "Processing",
    Cancelled: "Cancelled",
    Refunded: "Cancelled",
  };
  const gaugeMap = {};
  ordersByStatus.forEach(({ _id, count }) => {
    const group = statusColorMap[_id] || _id;
    gaugeMap[group] = (gaugeMap[group] || 0) + count;
  });
  const orderStatus = Object.entries(gaugeMap).map(([name, value]) => ({
    name,
    value,
  }));

  res.json({
    success: true,
    stats: {
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue: revenueAgg[0]?.total || 0,
      ordersByStatus,
      orderStatus,
      orderTrend,
      revenueTrend,
      weeklyRevenue,
      paymentMethods,
      recentOrders,
      lowStock,
    },
  });
});

// ─── Admin Payments ────────────────────────────────────────
const getAdminPayments = asyncHandler(async (req, res) => {
  const orders = await Order.find({ isPaid: true })
    .populate("user", "name email")
    .sort({ paidAt: -1 });

  const payments = orders.map((order) => ({
    orderId: order._id,
    shortId: order._id.toString().slice(-8).toUpperCase(),
    customerName: order.user?.name || order.shippingAddress.fullName,
    customerEmail: order.user?.email || "—",
    amount: order.totalPrice,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    provider: order.paymentResult?.provider || "—",
    transactionId:
      order.paymentResult?.paymentId || order.paymentResult?.orderId || "—",
    paidAt: order.paidAt,
    orderStatus: order.status,
  }));

  res.json({ success: true, payments });
});

// ─── Webhook Events (with cache + optimised Stripe calls) ──
const getWebhookEvents = asyncHandler(async (req, res) => {
  // ── Serve from cache if still fresh ──
  if (isCacheValid()) {
    return res.json({
      success: true,
      events: cache.webhookEvents,
      cached: true,
    });
  }

  const Stripe = require("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Fetch all orders from DB in one query
  const orders = await Order.find({})
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  // ── Batch-fetch Stripe data for UNPAID Card/UPI orders only ──
  // Fetch last 100 payment intents and checkout sessions ONCE
  // instead of one API call per order
  let stripePaymentIntents = [];
  let stripeCheckoutSessions = [];

  const hasUnpaidCardOrders = orders.some(
    (o) => !o.isPaid && ["Card", "UPI"].includes(o.paymentMethod),
  );

  if (hasUnpaidCardOrders) {
    try {
      // Fetch up to 100 recent payment intents in one call
      const [piList, sessionList] = await Promise.all([
        stripe.paymentIntents.list({ limit: 100 }),
        stripe.checkout.sessions.list({ limit: 100 }),
      ]);
      stripePaymentIntents = piList.data || [];
      stripeCheckoutSessions = sessionList.data || [];
    } catch (err) {
      console.error("Stripe batch fetch error:", err.message);
    }
  }

  // Build lookup maps for O(1) access
  // Map: dsOrderId → paymentIntent
  const piByOrderId = {};
  stripePaymentIntents.forEach((pi) => {
    if (pi.metadata?.dsOrderId) piByOrderId[pi.metadata.dsOrderId] = pi;
  });

  // Map: dsOrderId → checkout session
  const sessionByOrderId = {};
  stripeCheckoutSessions.forEach((s) => {
    const id = s.metadata?.dsOrderId || s.client_reference_id;
    if (id) sessionByOrderId[id] = s;
  });

  // ── Failure reason map ──
  const reasonMap = {
    insufficient_funds: "Insufficient funds",
    card_declined: "Card declined",
    lost_card: "Lost card — contact bank",
    stolen_card: "Stolen card — contact bank",
    expired_card: "Card expired",
    incorrect_cvc: "Incorrect CVC",
    incorrect_number: "Incorrect card number",
    processing_error: "Processing error — try again",
    do_not_honor: "Card blocked by bank",
    do_not_try_again: "Card permanently blocked",
    fraudulent: "Flagged as fraudulent",
    generic_decline: "Card declined (generic)",
    no_action_taken: "No action taken by bank",
    not_permitted: "Transaction not permitted",
    restricted_card: "Restricted card",
    revocation_of_all_authorizations: "Card revoked",
    security_violation: "Security violation",
    service_not_allowed: "Service not allowed",
    transaction_not_allowed: "Transaction not allowed",
    try_again_later: "Try again later",
  };

  // ── Process each order synchronously (no more per-order API calls) ──
  const events = orders.map((order) => {
    let failureReason = null;
    const oid = order._id.toString();

    if (["Card", "UPI"].includes(order.paymentMethod)) {
      if (!order.isPaid) {
        // Look up in pre-fetched maps
        const pi = piByOrderId[oid];
        const session = sessionByOrderId[oid];

        if (pi) {
          if (pi.last_payment_error) {
            const dc = pi.last_payment_error.decline_code;
            const code = pi.last_payment_error.code;
            if (dc && reasonMap[dc]) {
              failureReason = reasonMap[dc];
            } else if (code === "payment_intent_authentication_failure") {
              failureReason = "Authentication failed (3D Secure)";
            } else if (pi.last_payment_error.message) {
              failureReason = pi.last_payment_error.message;
            } else {
              failureReason = dc || code || "Payment failed";
            }
          } else if (pi.status === "canceled") {
            failureReason = "Payment cancelled by user";
          } else if (pi.status === "requires_payment_method") {
            failureReason = "Payment not completed";
          } else if (pi.status === "requires_action") {
            failureReason = "Awaiting 3D Secure authentication";
          }
        } else if (session) {
          if (session.status === "expired") {
            failureReason = "Checkout session expired";
          } else {
            failureReason = "Payment not attempted";
          }
        } else {
          failureReason = "Checkout abandoned";
        }
      }
    }

    if (order.paymentMethod === "COD") {
      if (order.status === "Cancelled") {
        failureReason = "Order cancelled";
      } else if (!order.isPaid) {
        failureReason = "Awaiting cash payment on delivery";
      }
    }

    return {
      orderId: order._id,
      shortId: oid.slice(-8).toUpperCase(),
      customerName: order.user?.name || order.shippingAddress?.fullName,
      customerEmail: order.user?.email || "—",
      products: order.items.map((i) => i.name).join(", "),
      amount: order.totalPrice,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      failureReason,
      isPaid: order.isPaid,
      createdAt: order.createdAt,
      paidAt: order.paidAt || null,
    };
  });

  // ── Store in cache ──
  cache.webhookEvents = events;
  cache.webhookEventsAt = Date.now();

  res.json({ success: true, events });
});

module.exports = {
  getDashboardStats,
  getAdminPayments,
  getWebhookEvents,
  invalidateWebhookCache,
};
