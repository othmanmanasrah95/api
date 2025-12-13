const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const { validateOrder, validateOrderUpdate } = require('../middleware/validation');
const {
  createOrder,
  getUserOrders,
  getOrder,
  updateOrderStatus,
  updatePaymentStatus,
  getAllOrders,
  processTUTPayment,
  debugTutBalance
} = require('../controllers/orderController');

// Public routes (guest checkout allowed)
router.post('/', optionalAuth, validateOrder, createOrder);

// Protected routes
router.get('/', protect, getUserOrders);
router.get('/:id', protect, getOrder);
router.put('/:id/status', protect, validateOrderUpdate, updateOrderStatus);
router.put('/:id/payment-status', protect, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin role required.'
    });
  }
  next();
}, updatePaymentStatus);
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