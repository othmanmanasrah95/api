const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');
const { protect: auth, optionalAuth } = require('../middleware/auth');
const { body, param } = require('express-validator');

// Validation middleware
const validatePaymentIntent = [
  body('orderId').isMongoId().withMessage('Valid order ID is required'),
  // Amount is now optional - we use the order total from database for security
  body('amount').optional().isNumeric().isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters')
];

const validatePaymentIntentId = [
  body('paymentIntentId').isString().notEmpty().withMessage('Payment intent ID is required')
];

const validateRefund = [
  body('paymentIntentId').isString().notEmpty().withMessage('Payment intent ID is required'),
  body('amount').optional().isNumeric().isFloat({ min: 0.01 }).withMessage('Valid refund amount is required'),
  body('reason').optional().isString().withMessage('Refund reason must be a string')
];

const validatePaymentIntentParam = [
  param('paymentIntentId').isString().notEmpty().withMessage('Payment intent ID is required')
];

// Stripe payment routes (allow guest checkout)
router.post('/create-payment-intent', optionalAuth, validatePaymentIntent, stripeController.createPaymentIntent);

router.post('/confirm-payment', auth, stripeController.confirmPayment);
router.post('/cancel-payment', auth, stripeController.cancelPayment);
router.post('/create-refund', auth, stripeController.createRefund);
router.get('/payment-status/:paymentIntentId', auth, stripeController.getPaymentStatus);

// Webhook endpoint (no auth required)
router.post('/webhook', 
  express.raw({ type: 'application/json' }),
  stripeController.handleWebhook
);

module.exports = router;
