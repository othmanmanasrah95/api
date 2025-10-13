const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateOrder, validateOrderUpdate } = require('../middleware/validation');
const {
  createOrder,
  getUserOrders,
  getOrder,
  updateOrderStatus,
  getAllOrders,
  processTUTPayment,
  debugTutBalance
} = require('../controllers/orderController');

// Public routes (none for orders)

// Protected routes
router.post('/', protect, validateOrder, createOrder);
router.get('/', protect, getUserOrders);
router.get('/:id', protect, getOrder);
router.put('/:id/status', protect, validateOrderUpdate, updateOrderStatus);
router.post('/:id/process-tut-payment', protect, processTUTPayment);
router.get('/debug-tut-balance', protect, debugTutBalance);

// Admin routes
router.get('/admin/all', protect, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin role required.'
    });
  }
  next();
}, getAllOrders);

module.exports = router;