const emailService = require('../services/emailService');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Send contact form message
// @route   POST /api/contact
// @access  Public
exports.sendContactMessage = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validate required fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      error: 'All fields are required'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }

  try {
    // Send email notification to support team
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.FROM_EMAIL || 'hello@tourath.com';
    
    // Send email to support team
    const emailResult = await emailService.sendMarketplaceNotificationEmail(
      supportEmail,
      'Zeituna Support Team',
      {
        subject: `Contact Form: ${subject}`,
        title: 'New Contact Form Submission',
        message: `You have received a new contact form submission from ${name}.`,
        content: `
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #1f2937; margin-bottom: 15px;">Contact Details:</h4>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <h4 style="color: #1f2937; margin-bottom: 10px;">Message:</h4>
            <p style="white-space: pre-wrap; background: white; padding: 15px; border-radius: 6px;">${message}</p>
          </div>
        `
      }
    );
    
    // Also send confirmation email to the user
    try {
      await emailService.sendMarketplaceNotificationEmail(
        email,
        name,
        {
          subject: 'Thank you for contacting Zeituna',
          title: 'We received your message',
          message: `Thank you for reaching out to us, ${name}! We have received your message and will get back to you as soon as possible.`,
          content: `
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h4 style="color: #065f46; margin-bottom: 10px;">Your Message:</h4>
              <p style="white-space: pre-wrap; background: white; padding: 15px; border-radius: 6px;">${message}</p>
              <p style="margin-top: 15px; color: #047857;">We typically respond within 24 hours. If your inquiry is urgent, please call us at +970 (56) 807-6985.</p>
            </div>
          `
        }
      );
    } catch (userEmailError) {
      console.error('Failed to send confirmation email to user:', userEmailError);
      // Don't fail the contact form submission if user confirmation email fails
    }

    if (emailResult.success) {
      res.status(200).json({
        success: true,
        message: 'Your message has been sent successfully. We will get back to you soon!'
      });
    } else {
      // Even if email fails, we still return success to user
      // but log the error for admin review
      console.error('Failed to send contact form email:', emailResult.error);
      res.status(200).json({
        success: true,
        message: 'Your message has been received. We will get back to you soon!',
        warning: 'Email notification may not have been sent, but your message was received.'
      });
    }
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message. Please try again later.'
    });
  }
});

