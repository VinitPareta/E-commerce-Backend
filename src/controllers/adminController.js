const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");

// @desc    Admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
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

  // Order Status breakdown
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

  // Revenue Last 7 Days
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Build array of last 7 days (oldest → today)
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7.push({
      date: d.toISOString().slice(0, 10), // "YYYY-MM-DD"
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

  // Merge real data into the 7-day slots
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

  // Payment Methods breakdown
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
      weeklyRevenue, // ← NEW
      paymentMethods,
      recentOrders,
      lowStock,
    },
  });
});
//
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
const getWebhookEvents = asyncHandler(async (req, res) => {
  const Stripe = require("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Fetch ALL orders (paid + unpaid + cancelled)
  const orders = await Order.find({})
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  const events = await Promise.all(
    orders.map(async (order) => {
      let failureReason = null;
      let stripeStatus = null;

      // For Card/UPI — fetch failure reason from Stripe
      if (
        ["Card", "UPI"].includes(order.paymentMethod) &&
        order.paymentResult?.paymentId
      ) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            order.paymentResult.paymentId,
          );
          stripeStatus = paymentIntent.status;

          if (paymentIntent.status !== "succeeded") {
            const charge = paymentIntent.last_payment_error;
            if (charge) {
              failureReason = charge.message || charge.code || "Payment failed";
            } else if (paymentIntent.status === "requires_payment_method") {
              failureReason = "Insufficient funds or card declined";
            } else if (paymentIntent.status === "canceled") {
              failureReason = "Payment cancelled by user";
            } else {
              failureReason = paymentIntent.status;
            }
          }

          // Check for underpaid/overpaid via charges
          if (paymentIntent.status === "succeeded") {
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
                stripeStatus = "underpaid";
              } else if (amountPaid > orderAmount + 1) {
                failureReason = `Overpaid — paid ₹${amountPaid} of ₹${orderAmount}`;
                stripeStatus = "overpaid";
              }
            }
          }
        } catch (err) {
          failureReason = "Unable to fetch Stripe details";
        }
      }

      // For COD
      if (order.paymentMethod === "COD") {
        if (order.status === "Cancelled") {
          failureReason = "Order cancelled";
        } else if (order.paymentStatus === "Unpaid" && order.isPaid === false) {
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

module.exports = { getDashboardStats, getAdminPayments, getWebhookEvents };
