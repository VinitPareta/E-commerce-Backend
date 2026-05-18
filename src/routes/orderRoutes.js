const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

// Register before `/:id` — otherwise Express may treat "myorders" / "me" as an :id value
router.get('/me', protect, getMyOrders);
router.get('/myorders', protect, getMyOrders);

router.route('/').post(protect, createOrder).get(protect, admin, getAllOrders);

router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, admin, updateOrderStatus);

module.exports = router;
