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
  async sendOrderConfirmationEmail(userEmail, userName, orderData) {
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
              ${orderData.items.map(item => `
                <div class="item">
                  <span>${item.name} x${item.quantity}</span>
                  <span>$${item.price}</span>
                </div>
              `).join('')}
              <div class="item total">
                <span>Total</span>
                <span>$${orderData.totals.total}</span>
              </div>
            </div>
            
            <p><strong>Shipping Address:</strong><br>
            ${orderData.customer.firstName} ${orderData.customer.lastName}<br>
            ${orderData.shipping.address}<br>
            ${orderData.shipping.city}, ${orderData.shipping.postalCode}<br>
            ${orderData.shipping.country}</p>
            
            <p>We'll send you tracking information once your order ships.</p>
            
            <p>Questions? Contact us at <a href="mailto:${this.supportEmail}">${this.supportEmail}</a></p>
            
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
}

module.exports = new EmailService();
