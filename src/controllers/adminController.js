const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');

// @desc    Admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalProducts, totalOrders, totalUsers, revenueAgg, recentOrders, lowStock] =
    await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      Order.find({})
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(5),
      Product.find({ stock: { $lte: 5 } }).limit(5),
    ]);

  const ordersByStatus = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    stats: {
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue: revenueAgg[0]?.total || 0,
      ordersByStatus,
      recentOrders,
      lowStock,
    },
  });
});

module.exports = { getDashboardStats };
