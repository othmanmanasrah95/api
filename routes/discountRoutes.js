const express = require('express');
const router = express.Router();
const {
  generateDiscountForRedemption,
  getUserDiscounts,
  validateDiscountCode,
  applyDiscountCode,
  getAllDiscounts,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode
} = require('../controllers/discountController');
const { protect, authorize } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation middleware
const validateDiscountCreation = [
  body('code')
    .isLength({ min: 3, max: 20 })
    .withMessage('Discount code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Discount code must contain only uppercase letters and numbers'),
  body('percentage')
    .isFloat({ min: 1, max: 100 })
    .withMessage('Percentage must be between 1 and 100'),
  body('userEmail')
    .isEmail()
    .withMessage('Valid user email is required'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be a valid date'),
  body('minOrderAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum order amount must be a positive number'),
  body('maxDiscountAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum discount amount must be a positive number')
];

// Public routes
router.post('/validate', validateDiscountCode);

// User routes (authenticated)
router.post('/generate', protect, generateDiscountForRedemption);
router.get('/my-discounts', protect, getUserDiscounts);
router.post('/apply', protect, applyDiscountCode);

// Admin routes
router.get('/admin/all', protect, authorize('admin'), getAllDiscounts);
router.post('/admin/create', protect, authorize('admin'), validateDiscountCreation, createDiscountCode);
router.put('/admin/:id', protect, authorize('admin'), updateDiscountCode);
router.delete('/admin/:id', protect, authorize('admin'), deleteDiscountCode);

module.exports = router;
