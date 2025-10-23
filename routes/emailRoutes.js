const express = require('express');
const router = express.Router();
const {
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendTreeAdoptionEmail,
  sendPasswordResetEmail,
  sendTUTRewardEmail,
  sendMarketplaceNotificationEmail,
  sendBulkEmails,
  testEmailService
} = require('../controllers/emailController');
const { protect, authorize } = require('../middleware/auth');
const { validateEmail } = require('../middleware/validation');

// Test email service (Admin only)
router.get('/test', protect, authorize('admin'), testEmailService);

// Send welcome email (Admin only)
router.post('/welcome', protect, authorize('admin'), validateEmail, sendWelcomeEmail);

// Send order confirmation email (Authenticated users)
router.post('/order-confirmation', protect, sendOrderConfirmationEmail);

// Send tree adoption confirmation email (Authenticated users)
router.post('/tree-adoption', protect, sendTreeAdoptionEmail);

// Send password reset email (Public)
router.post('/password-reset', validateEmail, sendPasswordResetEmail);

// Send TUT reward notification email (Authenticated users)
router.post('/tut-reward', protect, sendTUTRewardEmail);

// Send marketplace notification email (Admin only)
router.post('/marketplace-notification', protect, authorize('admin'), sendMarketplaceNotificationEmail);

// Send bulk emails (Admin only)
router.post('/bulk', protect, authorize('admin'), sendBulkEmails);

module.exports = router;
