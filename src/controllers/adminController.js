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
  const Stripe = require("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const orders = await Order.find({})
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  const events = await Promise.all(
    orders.map(async (order) => {
      let failureReason = null;
      let stripeStatus = null;

      // ── Card / UPI ──────────────────────────────────────────
      if (["Card", "UPI"].includes(order.paymentMethod)) {
        // PAID — check underpaid/overpaid
        if (order.isPaid && order.paymentResult?.paymentId) {
          try {
            const charges = await stripe.charges.list({
              payment_intent: order.paymentResult.paymentId,
              limit: 1,
            });
            const charge = charges.data[0];
            if (charge) {
              const amountPaid = charge.amount / 100;
              const orderAmount = order.totalPrice;
              if (amountPaid < orderAmount - 1) {
                failureReason = `Underpaid — paid ₹${amountPaid} of ₹${orderAmount}`;
              } else if (amountPaid > orderAmount + 1) {
                failureReason = `Overpaid — paid ₹${amountPaid} of ₹${orderAmount}`;
              }
            }
          } catch (err) {
            // ignore
          }
        }

        // UNPAID — search payment intents by metadata
        if (!order.isPaid) {
          try {
            // Search payment intents filtered by metadata order ID
            const paymentIntents = await stripe.paymentIntents.search({
              query: `metadata['dsOrderId']:'${order._id.toString()}'`,
              limit: 5,
            });

            let pi = paymentIntents?.data?.[0];

            // Fallback: search checkout sessions if no payment intent found
            if (!pi) {
              const sessions = await stripe.checkout.sessions.list({
                limit: 100,
              });
              const session = sessions.data.find(
                (s) =>
                  s.metadata?.dsOrderId === order._id.toString() ||
                  s.client_reference_id === order._id.toString(),
              );

              if (session?.payment_intent) {
                pi = await stripe.paymentIntents.retrieve(
                  session.payment_intent,
                );
              } else if (session?.status === "expired") {
                failureReason = "Checkout session expired";
              } else if (!session) {
                failureReason = "Checkout abandoned";
              } else {
                failureReason = "Payment not attempted";
              }
            }

            // Now extract failure reason from payment intent
            if (pi) {
              stripeStatus = pi.status;

              if (pi.last_payment_error) {
                const dc = pi.last_payment_error.decline_code;
                const code = pi.last_payment_error.code;

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
            }
          } catch (err) {
            console.error("Stripe lookup error:", err.message);
            failureReason = "Unable to fetch Stripe details";
          }
        }
      }

      // ── COD ─────────────────────────────────────────────────
      if (order.paymentMethod === "COD") {
        if (order.status === "Cancelled") {
          failureReason = "Order cancelled";
        } else if (!order.isPaid) {
          failureReason = "Awaiting cash payment on delivery";
        }
      }

      return {
        orderId: order._id,
        shortId: order._id.toString().slice(-8).toUpperCase(),
        customerName: order.user?.name || order.shippingAddress?.fullName,
        customerEmail: order.user?.email || "—",
        products: order.items.map((i) => i.name).join(", "),
        amount: order.totalPrice,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
        stripeStatus,
        failureReason,
        isPaid: order.isPaid,
        createdAt: order.createdAt,
        paidAt: order.paidAt || null,
      };
    }),
  );

  res.json({ success: true, events });
});

module.exports = {
  getDashboardStats,
  getAdminPayments,
  getWebhookEvents,
  invalidateWebhookCache,
};
