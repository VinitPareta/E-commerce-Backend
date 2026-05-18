const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const User = require('../models/User');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const {
    items,
    shippingAddress,
    paymentMethod = 'COD',
    shippingPrice = 0,
    taxPrice = 0,
  } = req.body;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  // Verify and snapshot items from DB to prevent tampering
  const orderItems = [];
  let itemsPrice = 0;

  for (const it of items) {
    const product = await Product.findById(it.product);
    if (!product) {
      res.status(404);
      throw new Error(`Product not found: ${it.product}`);
    }
    if (product.stock < it.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for ${product.name}`);
    }
    const price =
      product.discountPrice && product.discountPrice > 0
        ? product.discountPrice
        : product.price;
    itemsPrice += price * it.quantity;

    orderItems.push({
      product: product._id,
      name: product.name,
      image: product.images?.[0] || '',
      price,
      quantity: it.quantity,
      size: it.size || '',
      color: it.color || '',
    });

    product.stock -= it.quantity;
    product.inStock = product.stock > 0;
    await product.save();
  }

  const totalPrice =
    Number(itemsPrice) + Number(shippingPrice) + Number(taxPrice);

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    // Card/UPI are paid only after Razorpay verification
    isPaid: false,
    paidAt: null,
  });

  if (shippingAddress) {
    const user = await User.findById(req.user._id);
    if (user) {
      user.address = shippingAddress;
      await user.save();
    }
  }

  // Empty cart after order
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    cart.items = [];
    await cart.save();
  }

  res.status(201).json({ success: true, order });
});

// @desc    Get logged in user orders
// @route   GET /api/orders/me  (and GET /api/orders/myorders — same handler)
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, count: orders.length, orders });
});

// @desc    Get order by id
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id === 'me' || id === 'myorders') {
    res.status(404);
    throw new Error('Order not found');
  }

  const order = await Order.findById(id).populate('user', 'name email');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (
    order.user._id.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  res.json({ success: true, order });
});

// @desc    Get all orders (admin)
// @route   GET /api/orders
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({})
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: orders.length, orders });
});

// @desc    Update order status (admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  order.status = status || order.status;
  if (status === 'Delivered') {
    order.deliveredAt = Date.now();
    order.isPaid = true;
    order.paidAt = order.paidAt || Date.now();
  }
  const updated = await order.save();
  res.json({ success: true, order: updated });
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
};
