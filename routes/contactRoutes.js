const express = require('express');
const router = express.Router();
const { sendContactMessage } = require('../controllers/contactController');
const { body } = require('express-validator');

// Validation middleware
const validateContactForm = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').trim().notEmpty().withMessage('Message is required')
];

// @route   POST /api/contact
// @desc    Send contact form message
// @access  Public
router.post('/', validateContactForm, sendContactMessage);

module.exports = router;









