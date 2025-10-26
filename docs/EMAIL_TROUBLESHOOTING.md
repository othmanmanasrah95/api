# Email Service Troubleshooting Guide

## 🚨 Common Issues and Solutions

### 1. **500 Internal Server Error**

**Symptoms:**
- `GET /api/email/test` returns 500
- `POST /api/email/marketplace-notification` returns 500

**Causes & Solutions:**

#### A. Missing RESEND_API_KEY
```bash
# Check if API key is set
echo $RESEND_API_KEY

# If empty, add to your .env file:
RESEND_API_KEY=re_your_api_key_here
```

#### B. Invalid API Key Format
```bash
# Resend API keys should start with 're_'
# Example: re_1234567890abcdef
```

#### C. Network/Connection Issues
- Check if your server can reach Resend API
- Verify firewall settings
- Check DNS resolution

### 2. **400 Bad Request Error**

**Symptoms:**
- `POST /api/email/welcome` returns 400

**Causes & Solutions:**

#### A. Missing Required Fields
```javascript
// Required fields for welcome email:
{
  "userEmail": "user@example.com",  // ✅ Required
  "userName": "John Doe"            // ✅ Required
}
```

#### B. Invalid Email Format
```javascript
// Valid email formats:
"user@example.com"     // ✅ Valid
"user+tag@example.com" // ✅ Valid
"user@subdomain.com"   // ✅ Valid

// Invalid email formats:
"user"                 // ❌ Invalid
"user@"                // ❌ Invalid
"@example.com"         // ❌ Invalid
```

### 3. **Email Service Not Configured**

**Symptoms:**
- Console shows: "Email service not configured - RESEND_API_KEY missing"
- All email endpoints return 503

**Solution:**
1. Get Resend API key from [resend.com](https://resend.com)
2. Add to your `.env` file:
```bash
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Zeituna Platform
SUPPORT_EMAIL=support@yourdomain.com
```

## 🔧 Debugging Steps

### Step 1: Check Email Service Status
```bash
curl http://localhost:7000/api/email/status
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "configured": true,
    "hasApiKey": true,
    "fromEmail": "noreply@yourdomain.com",
    "fromName": "Zeituna Platform",
    "supportEmail": "support@yourdomain.com"
  }
}
```

### Step 2: Test Email Service
```bash
# Run the test script
npm run test-email

# Or test via API (requires admin authentication)
curl -X GET http://localhost:7000/api/email/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Step 3: Check Server Logs
```bash
# Look for these log messages:
# ✅ Good: "Welcome email sent successfully: {email_id}"
# ❌ Bad: "Email service not configured - RESEND_API_KEY missing"
# ❌ Bad: "Error sending welcome email: {error_details}"
```

## 🛠️ Manual Testing

### Test Welcome Email
```bash
curl -X POST http://localhost:7000/api/email/welcome \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userEmail": "test@example.com",
    "userName": "Test User"
  }'
```

### Test Marketplace Notification
```bash
curl -X POST http://localhost:7000/api/email/marketplace-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "userEmail": "test@example.com",
    "userName": "Test User",
    "notificationData": {
      "subject": "Test Notification",
      "message": "This is a test message",
      "content": "<p>Test content</p>"
    }
  }'
```

## 🔍 Environment Variables Checklist

Make sure these are set in your `.env` file:

```bash
# Required
RESEND_API_KEY=re_your_api_key_here

# Optional (with defaults)
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Zeituna Platform
SUPPORT_EMAIL=support@yourdomain.com
FRONTEND_URL=http://localhost:5173
```

## 📊 Resend Dashboard

1. Go to [resend.com/dashboard](https://resend.com/dashboard)
2. Check API Keys section
3. Verify domain settings
4. Check sending limits
5. Review logs for failed emails

## 🚀 Quick Fixes

### Fix 1: Reset Environment Variables
```bash
# Stop the server
# Update .env file with correct values
# Restart the server
npm run dev
```

### Fix 2: Test with Simple Email
```javascript
// Use this minimal test in your code:
const emailService = require('./services/emailService');

emailService.sendWelcomeEmail('test@example.com', 'Test User')
  .then(result => console.log('Result:', result))
  .catch(error => console.error('Error:', error));
```

### Fix 3: Check Resend Account
1. Verify your Resend account is active
2. Check if you have sending credits
3. Verify your domain (if using custom domain)
4. Check rate limits

## 📞 Getting Help

If issues persist:

1. **Check Resend Documentation**: [resend.com/docs](https://resend.com/docs)
2. **Verify API Key**: Make sure it's valid and has proper permissions
3. **Check Network**: Ensure your server can reach Resend API
4. **Review Logs**: Look for specific error messages in server logs

## 🎯 Success Indicators

You'll know the email service is working when:

- ✅ `/api/email/status` returns `"configured": true`
- ✅ Test emails are sent successfully
- ✅ No 500 errors in server logs
- ✅ Emails appear in Resend dashboard
- ✅ Users receive welcome emails on registration

## 🔄 Common Workflows

### Development Setup
1. Get Resend API key
2. Add to `.env` file
3. Restart server
4. Test with `npm run test-email`
5. Verify in Resend dashboard

### Production Setup
1. Set environment variables in production
2. Verify domain in Resend
3. Test with production email
4. Monitor Resend dashboard
5. Set up alerts for failures
