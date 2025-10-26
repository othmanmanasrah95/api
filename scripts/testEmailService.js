require('dotenv').config();
const emailService = require('../services/emailService');

async function testEmailService() {
  console.log('🧪 Testing Email Service...\n');

  // Check configuration
  console.log('📋 Configuration Check:');
  console.log(`- RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- FROM_EMAIL: ${process.env.FROM_EMAIL || 'noreply@zeituna.com'}`);
  console.log(`- FROM_NAME: ${process.env.FROM_NAME || 'Zeituna Platform'}`);
  console.log(`- SUPPORT_EMAIL: ${process.env.SUPPORT_EMAIL || 'support@zeituna.com'}`);
  console.log(`- FRONTEND_URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);

  // Check if service is configured
  if (!emailService.isConfigured()) {
    console.log('❌ Email service is not configured. Please set RESEND_API_KEY environment variable.');
    return;
  }

  console.log('✅ Email service is configured.\n');

  // Test welcome email (use account owner's email for free tier)
  console.log('📧 Testing Welcome Email...');
  try {
    // For Resend free tier, we can only send to the account owner's email
    const testEmail = 'othmanmanasrah95@gmail.com';
    const result = await emailService.sendWelcomeEmail(testEmail, 'Test User');
    if (result.success) {
      console.log('✅ Welcome email test successful');
      console.log('📧 Email ID:', result.data?.id);
      console.log('📧 Sent to:', testEmail);
    } else {
      console.log('❌ Welcome email test failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Welcome email test error:', error.message);
  }

  console.log('\n🏁 Email service test completed.');
}

// Run the test
testEmailService().catch(console.error);
