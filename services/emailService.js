const { Resend } = require('resend');

class EmailService {
  constructor() {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️  RESEND_API_KEY not found in environment variables');
      this.resend = null;
    } else {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
    
    // Use Resend's default domain for testing if custom domain not verified
    // Check if the configured email uses a verified domain
    const configuredEmail = process.env.FROM_EMAIL || 'noreply@zeituna.com';
    const isCustomDomain = configuredEmail.includes('zeituna.com');
    
    this.fromEmail = isCustomDomain ? 'onboarding@resend.dev' : configuredEmail;
    this.fromName = process.env.FROM_NAME || 'Zeituna Platform';
    this.supportEmail = process.env.SUPPORT_EMAIL || 'hello@zeituna.com';
  }

  // Helper method to check if email service is configured
  isConfigured() {
    return this.resend !== null;
  }

  // Send welcome email to new users
  async sendWelcomeEmail(userEmail, userName) {
    try {
      if (!this.isConfigured()) {
        console.warn('Email service not configured - RESEND_API_KEY missing');
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: 'Welcome to Zeituna - Your Sustainable Journey Begins! 🌱',
        html: this.getWelcomeEmailTemplate(userName),
      });

      if (error) {
        console.error('Error sending welcome email:', error);
        return { success: false, error };
      }

      console.log('Welcome email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send email verification code
  async sendVerificationEmail(userEmail, userName, code) {
    try {
      if (!this.isConfigured()) {
        console.warn('Email service not configured - RESEND_API_KEY missing');
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: 'Verify your email address',
        html: this.getVerificationEmailTemplate(userName, code),
      });

      if (error) {
        console.error('Error sending verification email:', error);
        return { success: false, error };
      }

      console.log('Verification email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending verification email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send order confirmation email
  async sendOrderConfirmationEmail({ userEmail, userName, orderData }) {
    try {
      if (!this.isConfigured()) {
        console.warn('Email service not configured - RESEND_API_KEY missing');
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: `Order Confirmation - ${orderData.orderNumber}`,
        html: this.getOrderConfirmationTemplate(userName, orderData),
      });

      if (error) {
        console.error('Error sending order confirmation email:', error);
        return { success: false, error };
      }

      console.log('Order confirmation email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending order confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send order status update email
  async sendOrderStatusUpdateEmail({ userEmail, userName, orderData }) {
    try {
      if (!this.isConfigured()) {
        console.warn('Email service not configured - RESEND_API_KEY missing');
        return { success: false, error: 'Email service not configured' };
      }

      const statusMessages = {
        pending: 'Your order is being processed',
        confirmed: 'Your order has been confirmed',
        processing: 'Your order is being prepared',
        shipped: 'Your order has been shipped',
        delivered: 'Your order has been delivered',
        cancelled: 'Your order has been cancelled',
        refunded: 'Your order has been refunded'
      };

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: `Order Update - ${orderData.orderNumber}: ${statusMessages[orderData.status] || 'Status Updated'}`,
        html: this.getOrderStatusUpdateTemplate(userName, orderData),
      });

      if (error) {
        console.error('Error sending order status update email:', error);
        return { success: false, error };
      }

      console.log('Order status update email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending order status update email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send tree adoption confirmation email
  async sendTreeAdoptionEmail(userEmail, userName, treeData) {
    try {
      if (!this.isConfigured()) {
        console.warn('Email service not configured - RESEND_API_KEY missing');
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: `Tree Adoption Confirmed - ${treeData.name} 🌳`,
        html: this.getTreeAdoptionTemplate(userName, treeData),
      });

      if (error) {
        console.error('Error sending tree adoption email:', error);
        return { success: false, error };
      }

      console.log('Tree adoption email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending tree adoption email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send adoption certificate (self or gift)
  async sendAdoptionCertificateEmail({ recipientEmail, recipientName, adopterName, treeInfo, isGift }) {
    try {
      if (!this.isConfigured()) {
        console.warn('Email service not configured - RESEND_API_KEY missing');
        return { success: false, error: 'Email service not configured' };
      }

      const subject = isGift
        ? `A Tree Has Been Adopted For You 🌳`
        : `Your Tree Adoption Certificate 🌳`;

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [recipientEmail],
        subject,
        html: this.getAdoptionCertificateTemplate({ recipientName, adopterName, treeInfo, isGift })
      });

      if (error) {
        console.error('Error sending adoption certificate email:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error sending adoption certificate email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(userEmail, userName, resetToken) {
    try {
      if (!this.isConfigured()) {
        console.warn('Email service not configured - RESEND_API_KEY missing');
        return { success: false, error: 'Email service not configured' };
      }

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: 'Reset Your Zeituna Password',
        html: this.getPasswordResetTemplate(userName, resetUrl),
      });

      if (error) {
        console.error('Error sending password reset email:', error);
        return { success: false, error };
      }

      console.log('Password reset email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send TUT token reward notification
  async sendTUTRewardEmail(userEmail, userName, rewardData) {
    try {
      if (!this.isConfigured()) {
        console.warn('Email service not configured - RESEND_API_KEY missing');
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: `You've Earned ${rewardData.amount} TUT Tokens! 🎉`,
        html: this.getTUTRewardTemplate(userName, rewardData),
      });

      if (error) {
        console.error('Error sending TUT reward email:', error);
        return { success: false, error };
      }

      console.log('TUT reward email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending TUT reward email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send marketplace notification email
  async sendMarketplaceNotificationEmail(userEmail, userName, notificationData) {
    try {
      if (!this.isConfigured()) {
        console.warn('Email service not configured - RESEND_API_KEY missing');
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: notificationData.subject || 'New Update from Zeituna Marketplace',
        html: this.getMarketplaceNotificationTemplate(userName, notificationData),
      });

      if (error) {
        console.error('Error sending marketplace notification email:', error);
        return { success: false, error };
      }

      console.log('Marketplace notification email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending marketplace notification email:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== MILESTONE EMAILS ==========

  // Send first order milestone email
  async sendFirstOrderEmail({ userEmail, userName, orderData }) {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: '🎉 Congratulations on Your First Order!',
        html: this.getFirstOrderTemplate(userName, orderData),
      });

      if (error) {
        console.error('Error sending first order email:', error);
        return { success: false, error };
      }

      console.log('First order email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending first order email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send payment success email
  async sendPaymentSuccessEmail({ userEmail, userName, orderData }) {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: `✅ Payment Successful - Order #${orderData.orderNumber}`,
        html: this.getPaymentSuccessTemplate(userName, orderData),
      });

      if (error) {
        console.error('Error sending payment success email:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error sending payment success email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send order shipped email with tracking
  async sendOrderShippedEmail({ userEmail, userName, orderData }) {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: `📦 Your Order #${orderData.orderNumber} Has Shipped!`,
        html: this.getOrderShippedTemplate(userName, orderData),
      });

      if (error) {
        console.error('Error sending order shipped email:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error sending order shipped email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send order delivered celebration email
  async sendOrderDeliveredEmail({ userEmail, userName, orderData }) {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: `🎉 Your Order #${orderData.orderNumber} Has Been Delivered!`,
        html: this.getOrderDeliveredTemplate(userName, orderData),
      });

      if (error) {
        console.error('Error sending order delivered email:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error sending order delivered email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send first tree adoption milestone email
  async sendFirstTreeAdoptionEmail({ userEmail, userName, treeData }) {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: '🌳 Congratulations on Your First Tree Adoption!',
        html: this.getFirstTreeAdoptionTemplate(userName, treeData),
      });

      if (error) {
        console.error('Error sending first tree adoption email:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error sending first tree adoption email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send order milestone email (10, 25, 50, 100 orders)
  async sendOrderMilestoneEmail({ userEmail, userName, milestoneData }) {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: `🎊 Amazing Milestone: ${milestoneData.orderCount} Orders!`,
        html: this.getOrderMilestoneTemplate(userName, milestoneData),
      });

      if (error) {
        console.error('Error sending order milestone email:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error sending order milestone email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send tree adoption milestone email
  async sendTreeAdoptionMilestoneEmail({ userEmail, userName, milestoneData }) {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: `🌲 Tree Champion: ${milestoneData.treeCount} Trees Adopted!`,
        html: this.getTreeAdoptionMilestoneTemplate(userName, milestoneData),
      });

      if (error) {
        console.error('Error sending tree adoption milestone email:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error sending tree adoption milestone email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send TUT token milestone email
  async sendTUTTokenMilestoneEmail({ userEmail, userName, milestoneData }) {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: `🪙 Token Milestone: ${milestoneData.tokenAmount} TUT Tokens Earned!`,
        html: this.getTUTTokenMilestoneTemplate(userName, milestoneData),
      });

      if (error) {
        console.error('Error sending TUT token milestone email:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error sending TUT token milestone email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send account anniversary email
  async sendAccountAnniversaryEmail({ userEmail, userName, anniversaryData }) {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: `🎂 Happy ${anniversaryData.years} Year${anniversaryData.years > 1 ? 's' : ''} with Zeituna!`,
        html: this.getAccountAnniversaryTemplate(userName, anniversaryData),
      });

      if (error) {
        console.error('Error sending account anniversary email:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error sending account anniversary email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send wallet connected milestone email
  async sendWalletConnectedEmail({ userEmail, userName, walletAddress }) {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: '🔗 Wallet Connected Successfully!',
        html: this.getWalletConnectedTemplate(userName, walletAddress),
      });

      if (error) {
        console.error('Error sending wallet connected email:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error sending wallet connected email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send email verified success email (enhanced)
  async sendEmailVerifiedEmail({ userEmail, userName }) {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: '✅ Email Verified - Welcome to Zeituna!',
        html: this.getEmailVerifiedTemplate(userName),
      });

      if (error) {
        console.error('Error sending email verified email:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error sending email verified email:', error);
      return { success: false, error: error.message };
    }
  }

  // Email Templates
  getWelcomeEmailTemplate(userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Zeituna</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .feature { margin: 20px 0; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌱 Welcome to Zeituna!</h1>
            <p>Your sustainable journey starts here</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Welcome to Zeituna, where sustainability meets innovation. We're thrilled to have you join our community of conscious consumers and environmental advocates.</p>
            
            <div class="feature">
              <h3>🌳 Adopt a Tree</h3>
              <p>Make a lasting impact by adopting an olive tree and receiving a unique NFT certificate.</p>
            </div>
            
            <div class="feature">
              <h3>🛒 Sustainable Marketplace</h3>
              <p>Discover eco-friendly products from local artisans and support Palestinian communities.</p>
            </div>
            
            <div class="feature">
              <h3>🪙 Earn TUT Tokens</h3>
              <p>Get rewarded for your sustainable choices with our TUT token system.</p>
            </div>
            
            <p>Ready to start your journey?</p>
            <a href="${process.env.FRONTEND_URL}/roots" class="button">Explore Tree Adoption</a>
            <a href="${process.env.FRONTEND_URL}/marketplace" class="button">Visit Marketplace</a>
            
            <p>If you have any questions, feel free to reach out to us at <a href="mailto:${this.supportEmail}">${this.supportEmail}</a></p>
            
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getOrderConfirmationTemplate(userName, orderData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .total { font-weight: bold; font-size: 1.2em; color: #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Order Confirmed!</h1>
            <p>Order #${orderData.orderNumber}</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Thank you for your order! We've received your order and will process it shortly.</p>
            
            <div class="order-details">
              <h3>Order Details</h3>
              ${(orderData.items || []).map(item => `
                <div class="item">
                  <span>${item.name} x${item.quantity || 1}</span>
                  <span>$${(item.price || 0) * (item.quantity || 1)}</span>
                </div>
              `).join('')}
              <div class="item total">
                <span>Total</span>
                <span>$${orderData.totals?.total || 0}</span>
              </div>
            </div>
            
            ${orderData.shipping ? `<p><strong>Shipping Address:</strong><br>
            ${orderData.shipping.address}<br>
            ${orderData.shipping.city}, ${orderData.shipping.postalCode}<br>
            ${orderData.shipping.country}</p>` : ''}
            
            <p>We'll send you tracking information once your order ships.</p>
            
            <p>Questions? Contact us at <a href="mailto:${this.supportEmail}">${this.supportEmail}</a></p>
            
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getOrderStatusUpdateTemplate(userName, orderData) {
    const statusIcons = {
      pending: '⏳',
      confirmed: '✅',
      processing: '🔄',
      shipped: '📦',
      delivered: '🎉',
      cancelled: '❌',
      refunded: '💰'
    };

    const statusMessages = {
      pending: 'Your order is being processed',
      confirmed: 'Your order has been confirmed',
      processing: 'Your order is being prepared',
      shipped: 'Your order has been shipped',
      delivered: 'Your order has been delivered',
      cancelled: 'Your order has been cancelled',
      refunded: 'Your order has been refunded'
    };

    const status = orderData.status || 'pending';
    const icon = statusIcons[status] || '📋';
    const message = statusMessages[status] || 'Your order status has been updated';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .status-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #10b981; }
          .status-icon { font-size: 48px; margin-bottom: 10px; }
          .tracking { background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${icon} Order Status Update</h1>
            <p>Order #${orderData.orderNumber}</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>We have an update on your order:</p>
            
            <div class="status-box">
              <div class="status-icon">${icon}</div>
              <h3>${message}</h3>
              <p><strong>Status:</strong> ${status.charAt(0).toUpperCase() + status.slice(1)}</p>
            </div>
            
            ${orderData.trackingNumber ? `
            <div class="tracking">
              <p><strong>Tracking Number:</strong> ${orderData.trackingNumber}</p>
              <p>You can track your shipment using this tracking number.</p>
            </div>
            ` : ''}
            
            <p>View your order details and track its progress:</p>
            <a href="${process.env.FRONTEND_URL || 'https://zeituna.com'}/orders" class="button">View Order</a>
            
            <p>If you have any questions, feel free to reach out to us at <a href="mailto:${this.supportEmail}">${this.supportEmail}</a></p>
            
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getTreeAdoptionTemplate(userName, treeData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tree Adoption Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .tree-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌳 Tree Adoption Confirmed!</h1>
            <p>You've made a positive impact!</p>
          </div>
          <div class="content">
            <h2>Congratulations ${userName}!</h2>
            <p>You have successfully adopted <strong>${treeData.name}</strong> - a ${treeData.species} tree located in ${treeData.location}.</p>
            
            <div class="tree-info">
              <h3>${treeData.name}</h3>
              <p><strong>Species:</strong> ${treeData.species}</p>
              <p><strong>Location:</strong> ${treeData.location}</p>
              <p><strong>Planted:</strong> ${new Date(treeData.plantedDate).toLocaleDateString()}</p>
              <p><strong>Height:</strong> ${treeData.height}</p>
              <p><strong>CO2 Absorbed:</strong> ${treeData.co2Absorbed}</p>
            </div>
            
            <p>Your tree adoption helps support Palestinian farmers and contributes to environmental sustainability. You'll receive regular updates about your tree's growth and impact.</p>
            
            <a href="${process.env.FRONTEND_URL}/roots/tree/${treeData._id}" class="button">View Your Tree</a>
            
            <p>Thank you for making a difference! 🌱</p>
            
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getAdoptionCertificateTemplate({ recipientName, adopterName, treeInfo, isGift }) {
    const location = treeInfo?.location || 'Palestine';
    const treeName = treeInfo?.name || 'Olive Tree';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Adoption Certificate</title>
        <style>
          body { font-family: Georgia, 'Times New Roman', serif; background:#0f172a; margin:0; padding:0; }
          .wrap { max-width: 820px; margin: 0 auto; background: radial-gradient(1000px 500px at 50% -200px, rgba(255,255,255,0.06), rgba(255,255,255,0.0)), #0f172a; color: #e5e7eb; padding: 40px 24px; }
          .card { background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px 32px; text-align: center; }
          .title { letter-spacing: .25em; text-transform: uppercase; color:#d1fae5; font-weight: 600; }
          .name { font-family: 'Brush Script MT', cursive; font-size: 42px; color:#f3f4f6; margin: 20px 0; }
          .muted { color:#cbd5e1; }
          .cols { display:flex; justify-content: space-between; margin-top: 24px; color:#d1fae5; font-weight:600; }
          .tree { margin: 28px auto 0; width: 120px; opacity:.9; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <div class="title">This certificate is presented to</div>
            <div class="name">${recipientName}</div>
            <p class="muted">in recognition of ${isGift ? `${adopterName}'s` : 'your'} olive tree adoption in ${location}.</p>
            <p class="muted">Your adoption nurtures farmers, preserves heritage, and fuels a future of dignity and resilience.</p>
            <img class="tree" alt="tree" src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Tree_Silhouette_3.svg/240px-Tree_Silhouette_3.svg.png" />
            <div class="cols">
              <div>Location<br/><span class="muted">${location}</span></div>
              <div>Tree<br/><span class="muted">${treeName}</span></div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetTemplate(userName, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
            <p>Secure your account</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>We received a request to reset your password for your Zeituna account.</p>
            
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            
            <div class="warning">
              <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
            </div>
            
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            
            <p>If you have any questions, contact us at <a href="mailto:${this.supportEmail}">${this.supportEmail}</a></p>
            
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getTUTRewardTemplate(userName, rewardData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TUT Token Reward</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .reward-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #10b981; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 TUT Token Reward!</h1>
            <p>You've earned tokens for your sustainable actions</p>
          </div>
          <div class="content">
            <h2>Congratulations ${userName}!</h2>
            <p>You've earned <strong>${rewardData.amount} TUT tokens</strong> for ${rewardData.reason}!</p>
            
            <div class="reward-box">
              <h3>🪙 ${rewardData.amount} TUT Tokens</h3>
              <p><strong>Reason:</strong> ${rewardData.reason}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>You can use your TUT tokens to:</p>
            <ul>
              <li>Get discounts on products in our marketplace</li>
              <li>Adopt additional trees</li>
              <li>Support environmental initiatives</li>
            </ul>
            
            <a href="${process.env.FRONTEND_URL}/profile" class="button">View Your Tokens</a>
            
            <p>Keep up the great work! Every sustainable action makes a difference. 🌱</p>
            
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getMarketplaceNotificationTemplate(userName, notificationData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Marketplace Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛒 ${notificationData.title || 'Marketplace Update'}</h1>
            <p>New products and updates from Zeituna</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>${notificationData.message || 'We have exciting updates from our marketplace!'}</p>
            
            ${notificationData.content || ''}
            
            <a href="${process.env.FRONTEND_URL}/marketplace" class="button">Visit Marketplace</a>
            
            <p>Thank you for being part of our sustainable community!</p>
            
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getVerificationEmailTemplate(userName, code) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .code { font-size: 28px; letter-spacing: 6px; font-weight: bold; background: #111827; color: #ecfdf5; padding: 12px 16px; display: inline-block; border-radius: 8px; }
          .note { color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify your email</h1>
            <p>Complete your registration</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Use the verification code below to confirm your email address on Zeituna.</p>
            <p class="code">${code}</p>
            <p class="note">This code will expire in 10 minutes. If you didn't create an account, you can ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // ========== MILESTONE EMAIL TEMPLATES ==========

  getFirstOrderTemplate(userName, orderData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>First Order Milestone</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b, #f97316); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .milestone-box { background: linear-gradient(135deg, #fef3c7, #fde68a); border: 3px solid #f59e0b; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; }
          .celebration { font-size: 48px; margin: 10px 0; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Congratulations!</h1>
            <p>Your First Order Milestone</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <div class="milestone-box">
              <div class="celebration">🎊</div>
              <h2>You've Placed Your First Order!</h2>
              <p style="font-size: 18px; margin: 15px 0;">This is a special moment! You've taken your first step in supporting sustainable products and Palestinian communities.</p>
            </div>
            <p><strong>Order #${orderData.orderNumber}</strong> has been confirmed and is being prepared for you.</p>
            <p>As a thank you for joining our community, keep an eye out for special rewards and exclusive offers!</p>
            <a href="${process.env.FRONTEND_URL || 'https://zeituna.com'}/orders" class="button">View Your Order</a>
            <p>Thank you for choosing sustainability! 🌱</p>
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPaymentSuccessTemplate(userName, orderData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Successful</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-box { background: #d1fae5; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Successful!</h1>
            <p>Your order has been confirmed</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <div class="success-box">
              <h3 style="color: #065f46; margin: 0;">Payment Confirmed</h3>
              <p style="margin: 10px 0; color: #047857;">Order #${orderData.orderNumber}</p>
              <p style="margin: 10px 0; font-size: 20px; font-weight: bold; color: #065f46;">$${orderData.totals?.total || 0}</p>
            </div>
            <p>Your payment has been successfully processed. Your order is now confirmed and will be prepared for shipment.</p>
            <p>You'll receive tracking information once your order ships.</p>
            <a href="${process.env.FRONTEND_URL || 'https://zeituna.com'}/orders" class="button">Track Your Order</a>
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getOrderShippedTemplate(userName, orderData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Shipped</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .tracking-box { background: #dbeafe; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .tracking-number { font-size: 24px; font-weight: bold; color: #1e40af; text-align: center; padding: 10px; background: white; border-radius: 6px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Your Order Has Shipped!</h1>
            <p>Order #${orderData.orderNumber}</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Great news! Your order has been shipped and is on its way to you.</p>
            ${orderData.trackingNumber ? `
            <div class="tracking-box">
              <p style="margin: 0 0 10px 0;"><strong>Tracking Number:</strong></p>
              <div class="tracking-number">${orderData.trackingNumber}</div>
              <p style="margin: 10px 0 0 0; color: #1e40af;">Use this number to track your package</p>
            </div>
            ` : ''}
            <p>Your order should arrive within the estimated delivery timeframe. We'll notify you once it's delivered!</p>
            <a href="${process.env.FRONTEND_URL || 'https://zeituna.com'}/orders" class="button">Track Your Order</a>
            <p>Thank you for your patience! 🚚</p>
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getOrderDeliveredTemplate(userName, orderData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Delivered</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .celebration-box { background: linear-gradient(135deg, #d1fae5, #a7f3d0); border: 3px solid #10b981; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; }
          .celebration { font-size: 48px; margin: 10px 0; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Your Order Has Arrived!</h1>
            <p>Order #${orderData.orderNumber}</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <div class="celebration-box">
              <div class="celebration">📦✨</div>
              <h2 style="color: #065f46; margin: 15px 0;">Your Package Has Been Delivered!</h2>
              <p style="font-size: 16px; color: #047857;">We hope you love your purchase!</p>
            </div>
            <p>Your order should be waiting for you. If you have any questions or concerns about your order, please don't hesitate to reach out.</p>
            <p>We'd love to hear your feedback! Share your experience with us.</p>
            <a href="${process.env.FRONTEND_URL || 'https://zeituna.com'}/orders" class="button">View Order Details</a>
            <p>Thank you for choosing Zeituna! 🌱</p>
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getFirstTreeAdoptionTemplate(userName, treeData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>First Tree Adoption</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .milestone-box { background: linear-gradient(135deg, #d1fae5, #a7f3d0); border: 3px solid #10b981; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; }
          .celebration { font-size: 48px; margin: 10px 0; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌳 Congratulations!</h1>
            <p>Your First Tree Adoption</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <div class="milestone-box">
              <div class="celebration">🌲✨</div>
              <h2 style="color: #065f46; margin: 15px 0;">You've Adopted Your First Tree!</h2>
              <p style="font-size: 18px; color: #047857;">This is a momentous occasion! You've made a lasting impact on the environment and Palestinian communities.</p>
            </div>
            <p><strong>Tree:</strong> ${treeData.name || 'Your Olive Tree'}</p>
            <p><strong>Location:</strong> ${treeData.location || 'Palestine'}</p>
            <p>Your tree will continue to grow and make a positive environmental impact for years to come. You'll receive updates about your tree's progress!</p>
            <a href="${process.env.FRONTEND_URL || 'https://zeituna.com'}/roots" class="button">View Your Tree</a>
            <p>Thank you for making a difference! 🌱</p>
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getOrderMilestoneTemplate(userName, milestoneData) {
    const milestones = {
      10: { emoji: '🎯', message: 'You\'re a valued customer!' },
      25: { emoji: '🏆', message: 'You\'re a loyal supporter!' },
      50: { emoji: '👑', message: 'You\'re a true champion!' },
      100: { emoji: '💎', message: 'You\'re a legend!' }
    };

    const milestone = milestones[milestoneData.orderCount] || { emoji: '🎊', message: 'Amazing achievement!' };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Milestone</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .milestone-box { background: linear-gradient(135deg, #fef3c7, #fde68a); border: 3px solid #f59e0b; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; }
          .celebration { font-size: 64px; margin: 10px 0; }
          .count { font-size: 48px; font-weight: bold; color: #92400e; margin: 10px 0; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${milestone.emoji} Amazing Milestone!</h1>
            <p>${milestoneData.orderCount} Orders</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <div class="milestone-box">
              <div class="celebration">${milestone.emoji}</div>
              <div class="count">${milestoneData.orderCount}</div>
              <h2 style="color: #92400e; margin: 15px 0;">Orders Completed!</h2>
              <p style="font-size: 18px; color: #78350f;">${milestone.message}</p>
            </div>
            <p>Your continued support means the world to us and to the communities we serve. Thank you for being part of our sustainable journey!</p>
            <p>As a token of our appreciation, keep an eye out for exclusive offers and rewards!</p>
            <a href="${process.env.FRONTEND_URL || 'https://zeituna.com'}/orders" class="button">View Your Orders</a>
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getTreeAdoptionMilestoneTemplate(userName, milestoneData) {
    const milestones = {
      5: { emoji: '🌳', message: 'You\'re a tree champion!' },
      10: { emoji: '🌲🌲', message: 'You\'re a forest guardian!' },
      25: { emoji: '🌴', message: 'You\'re an environmental hero!' }
    };

    const milestone = milestones[milestoneData.treeCount] || { emoji: '🌲', message: 'Amazing achievement!' };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tree Adoption Milestone</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .milestone-box { background: linear-gradient(135deg, #d1fae5, #a7f3d0); border: 3px solid #10b981; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; }
          .celebration { font-size: 64px; margin: 10px 0; }
          .count { font-size: 48px; font-weight: bold; color: #065f46; margin: 10px 0; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${milestone.emoji} Tree Champion!</h1>
            <p>${milestoneData.treeCount} Trees Adopted</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <div class="milestone-box">
              <div class="celebration">${milestone.emoji}</div>
              <div class="count">${milestoneData.treeCount}</div>
              <h2 style="color: #065f46; margin: 15px 0;">Trees Adopted!</h2>
              <p style="font-size: 18px; color: #047857;">${milestone.message}</p>
            </div>
            <p>Your commitment to environmental sustainability is truly inspiring. Each tree you adopt makes a lasting impact on our planet and supports Palestinian farmers.</p>
            <p>Together, you've helped absorb tons of CO2 and create a greener future!</p>
            <a href="${process.env.FRONTEND_URL || 'https://zeituna.com'}/roots" class="button">View Your Trees</a>
            <p>Thank you for being a champion of sustainability! 🌱</p>
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getTUTTokenMilestoneTemplate(userName, milestoneData) {
    const milestones = {
      100: { emoji: '🪙', message: 'You\'re building your token collection!' },
      500: { emoji: '💰', message: 'You\'re a token collector!' },
      1000: { emoji: '💎', message: 'You\'re a token master!' }
    };

    const milestone = milestones[milestoneData.tokenAmount] || { emoji: '🪙', message: 'Amazing achievement!' };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TUT Token Milestone</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .milestone-box { background: linear-gradient(135deg, #fef3c7, #fde68a); border: 3px solid #f59e0b; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; }
          .celebration { font-size: 64px; margin: 10px 0; }
          .count { font-size: 48px; font-weight: bold; color: #92400e; margin: 10px 0; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${milestone.emoji} Token Milestone!</h1>
            <p>${milestoneData.tokenAmount} TUT Tokens</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <div class="milestone-box">
              <div class="celebration">${milestone.emoji}</div>
              <div class="count">${milestoneData.tokenAmount}</div>
              <h2 style="color: #92400e; margin: 15px 0;">TUT Tokens Earned!</h2>
              <p style="font-size: 18px; color: #78350f;">${milestone.message}</p>
            </div>
            <p>Your sustainable actions have earned you these tokens! Use them to get discounts, adopt more trees, or support environmental initiatives.</p>
            <p>Keep up the amazing work - every action counts!</p>
            <a href="${process.env.FRONTEND_URL || 'https://zeituna.com'}/profile" class="button">View Your Tokens</a>
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getAccountAnniversaryTemplate(userName, anniversaryData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Anniversary</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899, #db2777); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .anniversary-box { background: linear-gradient(135deg, #fce7f3, #fbcfe8); border: 3px solid #ec4899; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; }
          .celebration { font-size: 64px; margin: 10px 0; }
          .years { font-size: 48px; font-weight: bold; color: #9f1239; margin: 10px 0; }
          .button { display: inline-block; background: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎂 Happy Anniversary!</h1>
            <p>${anniversaryData.years} Year${anniversaryData.years > 1 ? 's' : ''} with Zeituna</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <div class="anniversary-box">
              <div class="celebration">🎂✨</div>
              <div class="years">${anniversaryData.years}</div>
              <h2 style="color: #9f1239; margin: 15px 0;">Year${anniversaryData.years > 1 ? 's' : ''} Together!</h2>
              <p style="font-size: 18px; color: #831843;">Thank you for being part of our journey!</p>
            </div>
            <p>It's been ${anniversaryData.years} amazing year${anniversaryData.years > 1 ? 's' : ''} since you joined Zeituna! We're so grateful to have you as part of our community.</p>
            <p><strong>Your Impact:</strong></p>
            <ul style="text-align: left; display: inline-block;">
              <li>${anniversaryData.orderCount || 0} orders placed</li>
              <li>${anniversaryData.treeCount || 0} trees adopted</li>
              <li>${anniversaryData.tokenBalance || 0} TUT tokens earned</li>
            </ul>
            <p>As a thank you, enjoy a special anniversary discount on your next order!</p>
            <a href="${process.env.FRONTEND_URL || 'https://zeituna.com'}" class="button">Continue Shopping</a>
            <p>Here's to many more years of sustainability together! 🌱</p>
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getWalletConnectedTemplate(userName, walletAddress) {
    const shortAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Wallet Connected</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .wallet-box { background: #dbeafe; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .address { font-family: monospace; font-size: 16px; color: #1e40af; background: white; padding: 10px; border-radius: 6px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔗 Wallet Connected!</h1>
            <p>Your wallet is now linked</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Great news! Your wallet has been successfully connected to your Zeituna account.</p>
            <div class="wallet-box">
              <p style="margin: 0 0 10px 0;"><strong>Connected Wallet:</strong></p>
              <div class="address">${shortAddress}</div>
            </div>
            <p>Now you can:</p>
            <ul style="text-align: left; display: inline-block;">
              <li>Use TUT tokens for payments</li>
              <li>Receive token rewards directly to your wallet</li>
              <li>Track your token balance</li>
              <li>Participate in blockchain-based features</li>
            </ul>
            <a href="${process.env.FRONTEND_URL || 'https://zeituna.com'}/profile" class="button">View Your Profile</a>
            <p>If you didn't connect your wallet, please contact us immediately.</p>
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getEmailVerifiedTemplate(userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verified</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-box { background: #d1fae5; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Email Verified!</h1>
            <p>Welcome to Zeituna</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <div class="success-box">
              <h3 style="color: #065f46; margin: 0;">Your email has been verified!</h3>
              <p style="margin: 10px 0; color: #047857;">Your account is now fully activated.</p>
            </div>
            <p>You're all set! Your Zeituna account is now active and ready to use. You can now:</p>
            <ul style="text-align: left; display: inline-block;">
              <li>Browse our sustainable marketplace</li>
              <li>Adopt olive trees</li>
              <li>Earn TUT tokens</li>
              <li>Support Palestinian communities</li>
            </ul>
            <a href="${process.env.FRONTEND_URL || 'https://zeituna.com'}" class="button">Start Your Journey</a>
            <p>Thank you for joining us! 🌱</p>
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send discount code email
  async sendDiscountCodeEmail(userEmail, userName, discountData) {
    try {
      if (!this.isConfigured()) {
        console.warn('Email service not configured - RESEND_API_KEY missing');
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [userEmail],
        subject: `🎁 Your Exclusive Discount Code - ${discountData.percentage}% Off!`,
        html: this.getDiscountCodeEmailTemplate(userName, discountData),
      });

      if (error) {
        console.error('Error sending discount code email:', error);
        return { success: false, error };
      }

      console.log('Discount code email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending discount code email:', error);
      return { success: false, error: error.message };
    }
  }

  getDiscountCodeEmailTemplate(userName, discountData) {
    const expiresDate = new Date(discountData.expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const minOrderText = discountData.minOrderAmount > 0 
      ? `<p style="margin: 5px 0;"><strong>Minimum Order:</strong> $${discountData.minOrderAmount}</p>`
      : '';
    
    const maxDiscountText = discountData.maxDiscountAmount 
      ? `<p style="margin: 5px 0;"><strong>Maximum Discount:</strong> $${discountData.maxDiscountAmount}</p>`
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Discount Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .discount-box { background: linear-gradient(135deg, #f3e8ff, #e9d5ff); border: 3px solid #8b5cf6; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; }
          .discount-code { font-size: 36px; font-weight: bold; color: #6d28d9; font-family: monospace; letter-spacing: 4px; margin: 15px 0; background: white; padding: 15px; border-radius: 8px; }
          .percentage { font-size: 48px; font-weight: bold; color: #7c3aed; margin: 10px 0; }
          .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎁 Special Discount For You!</h1>
            <p>Enjoy exclusive savings on your next purchase</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>We're excited to offer you an exclusive discount code!</p>
            
            <div class="discount-box">
              <div class="percentage">${discountData.percentage}% OFF</div>
              <p style="margin: 10px 0; font-size: 18px; color: #6d28d9;">Your Discount Code:</p>
              <div class="discount-code">${discountData.code}</div>
              <p style="margin: 10px 0; color: #7c3aed;">Valid until ${expiresDate}</p>
            </div>
            
            <div class="details">
              <h3 style="margin-top: 0; color: #6d28d9;">Discount Details</h3>
              ${discountData.description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${discountData.description}</p>` : ''}
              ${minOrderText}
              ${maxDiscountText}
              <p style="margin: 5px 0;"><strong>Expires:</strong> ${expiresDate}</p>
            </div>
            
            <p>Use this code at checkout to enjoy your discount on sustainable products from our marketplace!</p>
            
            <a href="${process.env.FRONTEND_URL || 'https://zeituna.com'}/marketplace" class="button">Shop Now</a>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
              <strong>How to use:</strong><br>
              1. Add items to your cart<br>
              2. Go to checkout<br>
              3. Enter the discount code: <strong>${discountData.code}</strong><br>
              4. Enjoy your savings!
            </p>
            
            <p>Thank you for being a valued member of our community! 🌱</p>
            
            <p>Best regards,<br>The Zeituna Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
