const emailService = require('../services/emailService');
const User = require('../models/user');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Send welcome email to new user
// @route   POST /api/email/welcome
// @access  Private/Admin
exports.sendWelcomeEmail = asyncHandler(async (req, res) => {
  const { userEmail, userName } = req.body;

  if (!userEmail || !userName) {
    return res.status(400).json({
      success: false,
      error: 'User email and name are required'
    });
  }

  const result = await emailService.sendWelcomeEmail(userEmail, userName);

  if (result.success) {
    res.status(200).json({
      success: true,
      message: 'Welcome email sent successfully',
      data: result.data
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Failed to send welcome email',
      details: result.error
    });
  }
});

// @desc    Send order confirmation email
// @route   POST /api/email/order-confirmation
// @access  Private
exports.sendOrderConfirmationEmail = asyncHandler(async (req, res) => {
  const { userEmail, userName, orderData } = req.body;

  if (!userEmail || !userName || !orderData) {
    return res.status(400).json({
      success: false,
      error: 'User email, name, and order data are required'
    });
  }

  const result = await emailService.sendOrderConfirmationEmail(userEmail, userName, orderData);

  if (result.success) {
    res.status(200).json({
      success: true,
      message: 'Order confirmation email sent successfully',
      data: result.data
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Failed to send order confirmation email',
      details: result.error
    });
  }
});

// @desc    Send tree adoption confirmation email
// @route   POST /api/email/tree-adoption
// @access  Private
exports.sendTreeAdoptionEmail = asyncHandler(async (req, res) => {
  const { userEmail, userName, treeData } = req.body;

  if (!userEmail || !userName || !treeData) {
    return res.status(400).json({
      success: false,
      error: 'User email, name, and tree data are required'
    });
  }

  const result = await emailService.sendTreeAdoptionEmail(userEmail, userName, treeData);

  if (result.success) {
    res.status(200).json({
      success: true,
      message: 'Tree adoption email sent successfully',
      data: result.data
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Failed to send tree adoption email',
      details: result.error
    });
  }
});

// @desc    Send password reset email
// @route   POST /api/email/password-reset
// @access  Public
exports.sendPasswordResetEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required'
    });
  }

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Generate reset token (you might want to use a more secure method)
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  
  // Store reset token in user document (you might want to add a field for this)
  // For now, we'll just send the email
  const result = await emailService.sendPasswordResetEmail(email, user.name, resetToken);

  if (result.success) {
    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully',
      data: result.data
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Failed to send password reset email',
      details: result.error
    });
  }
});

// @desc    Send TUT reward notification email
// @route   POST /api/email/tut-reward
// @access  Private
exports.sendTUTRewardEmail = asyncHandler(async (req, res) => {
  const { userEmail, userName, rewardData } = req.body;

  if (!userEmail || !userName || !rewardData) {
    return res.status(400).json({
      success: false,
      error: 'User email, name, and reward data are required'
    });
  }

  const result = await emailService.sendTUTRewardEmail(userEmail, userName, rewardData);

  if (result.success) {
    res.status(200).json({
      success: true,
      message: 'TUT reward email sent successfully',
      data: result.data
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Failed to send TUT reward email',
      details: result.error
    });
  }
});

// @desc    Send marketplace notification email
// @route   POST /api/email/marketplace-notification
// @access  Private/Admin
exports.sendMarketplaceNotificationEmail = asyncHandler(async (req, res) => {
  const { userEmail, userName, notificationData } = req.body;

  if (!userEmail || !userName || !notificationData) {
    return res.status(400).json({
      success: false,
      error: 'User email, name, and notification data are required'
    });
  }

  const result = await emailService.sendMarketplaceNotificationEmail(userEmail, userName, notificationData);

  if (result.success) {
    res.status(200).json({
      success: true,
      message: 'Marketplace notification email sent successfully',
      data: result.data
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Failed to send marketplace notification email',
      details: result.error
    });
  }
});

// @desc    Send bulk emails to multiple users
// @route   POST /api/email/bulk
// @access  Private/Admin
exports.sendBulkEmails = asyncHandler(async (req, res) => {
  const { emails, subject, template, data } = req.body;

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Emails array is required and must not be empty'
    });
  }

  const results = [];
  const errors = [];

  for (const emailData of emails) {
    try {
      let result;
      
      switch (template) {
        case 'welcome':
          result = await emailService.sendWelcomeEmail(emailData.email, emailData.name);
          break;
        case 'marketplace':
          result = await emailService.sendMarketplaceNotificationEmail(
            emailData.email, 
            emailData.name, 
            { ...data, subject }
          );
          break;
        default:
          throw new Error(`Unknown template: ${template}`);
      }

      results.push({ email: emailData.email, success: result.success, data: result.data });
      
      if (!result.success) {
        errors.push({ email: emailData.email, error: result.error });
      }
    } catch (error) {
      errors.push({ email: emailData.email, error: error.message });
    }
  }

  res.status(200).json({
    success: errors.length === 0,
    message: `Bulk email operation completed. ${results.length} successful, ${errors.length} failed.`,
    data: {
      results,
      errors
    }
  });
});

// @desc    Test email service
// @route   GET /api/email/test
// @access  Private/Admin
exports.testEmailService = asyncHandler(async (req, res) => {
  // Check if email service is configured
  if (!emailService.isConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Email service not configured',
      message: 'RESEND_API_KEY environment variable is missing'
    });
  }

  const testEmail = req.user.email;
  const testName = req.user.name;

  const result = await emailService.sendWelcomeEmail(testEmail, testName);

  if (result.success) {
    res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      data: result.data
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      details: result.error
    });
  }
});

// @desc    Check email service status
// @route   GET /api/email/status
// @access  Public
exports.getEmailServiceStatus = asyncHandler(async (req, res) => {
  const isConfigured = emailService.isConfigured();
  const hasApiKey = !!process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'noreply@zeituna.com';
  const fromName = process.env.FROM_NAME || 'Zeituna Platform';

  res.status(200).json({
    success: true,
    data: {
      configured: isConfigured,
      hasApiKey,
      fromEmail,
      fromName,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@zeituna.com'
    }
  });
});
