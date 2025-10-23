# Email Service Setup Guide

This guide explains how to set up and use the Resend email service integration in the Zeituna platform.

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
cd api
npm install resend
```

### 2. Get Resend API Key

1. Go to [Resend.com](https://resend.com)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key (starts with `re_`)

### 3. Configure Environment Variables

Add these variables to your `.env` file:

```bash
# Email Configuration (Resend)
RESEND_API_KEY=re_your_resend_api_key_here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Zeituna Platform
SUPPORT_EMAIL=support@yourdomain.com
```

### 4. Verify Domain (Optional but Recommended)

1. In Resend dashboard, go to Domains
2. Add your domain (e.g., `yourdomain.com`)
3. Follow DNS verification steps
4. Update `FROM_EMAIL` to use your verified domain

## 📧 Available Email Types

### 1. Welcome Email
- **Trigger**: User registration
- **Template**: Welcome message with platform features
- **Endpoint**: `POST /api/email/welcome`

### 2. Order Confirmation
- **Trigger**: Order placement
- **Template**: Order details and shipping info
- **Endpoint**: `POST /api/email/order-confirmation`

### 3. Tree Adoption Confirmation
- **Trigger**: Tree adoption
- **Template**: Tree details and adoption certificate
- **Endpoint**: `POST /api/email/tree-adoption`

### 4. Password Reset
- **Trigger**: Password reset request
- **Template**: Reset link with security info
- **Endpoint**: `POST /api/email/password-reset`

### 5. TUT Token Reward
- **Trigger**: Token rewards
- **Template**: Reward notification and usage info
- **Endpoint**: `POST /api/email/tut-reward`

### 6. Marketplace Notifications
- **Trigger**: Admin notifications
- **Template**: Custom marketplace updates
- **Endpoint**: `POST /api/email/marketplace-notification`

## 🛠️ Usage Examples

### Backend Usage

```javascript
const emailService = require('./services/emailService');

// Send welcome email
await emailService.sendWelcomeEmail('user@example.com', 'John Doe');

// Send order confirmation
await emailService.sendOrderConfirmationEmail('user@example.com', 'John Doe', {
  orderNumber: 'ORD-123456',
  items: [{ name: 'Olive Oil', quantity: 2, price: 15.99 }],
  totals: { total: 31.98 },
  customer: { firstName: 'John', lastName: 'Doe' },
  shipping: { address: '123 Main St', city: 'New York', postalCode: '10001', country: 'USA' }
});
```

### Frontend Usage

```typescript
import emailService from '../services/emailService';

// Send welcome email
await emailService.sendWelcomeEmail('user@example.com', 'John Doe');

// Send order confirmation
await emailService.sendOrderConfirmationEmail({
  userEmail: 'user@example.com',
  userName: 'John Doe',
  orderData: { /* order data */ }
});
```

## 🔧 API Endpoints

### Test Email Service
```http
GET /api/email/test
Authorization: Bearer <admin-token>
```

### Send Welcome Email
```http
POST /api/email/welcome
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "userEmail": "user@example.com",
  "userName": "John Doe"
}
```

### Send Order Confirmation
```http
POST /api/email/order-confirmation
Authorization: Bearer <user-token>
Content-Type: application/json

{
  "userEmail": "user@example.com",
  "userName": "John Doe",
  "orderData": {
    "orderNumber": "ORD-123456",
    "items": [...],
    "totals": {...},
    "customer": {...},
    "shipping": {...}
  }
}
```

### Send Bulk Emails
```http
POST /api/email/bulk
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "emails": [
    { "email": "user1@example.com", "name": "User 1" },
    { "email": "user2@example.com", "name": "User 2" }
  ],
  "subject": "Important Update",
  "template": "marketplace",
  "data": {
    "message": "New products available!",
    "content": "<p>Check out our latest sustainable products.</p>"
  }
}
```

## 🎨 Customizing Email Templates

Email templates are located in `api/services/emailService.js`. Each template method returns HTML:

```javascript
getWelcomeEmailTemplate(userName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        /* Your custom styles */
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Welcome ${userName}!</h1>
        <!-- Your custom content -->
      </div>
    </body>
    </html>
  `;
}
```

## 🔒 Security Considerations

1. **API Key Protection**: Never commit your Resend API key to version control
2. **Rate Limiting**: Email endpoints are protected by rate limiting
3. **Input Validation**: All email inputs are validated
4. **Admin Only**: Some endpoints require admin privileges

## 📊 Monitoring and Logging

Email sending is logged to the console:

```javascript
// Success
console.log('Welcome email sent successfully:', data);

// Error
console.error('Failed to send welcome email:', error);
```

## 🚨 Troubleshooting

### Common Issues

1. **Invalid API Key**
   - Verify your Resend API key is correct
   - Check if the key has proper permissions

2. **Domain Not Verified**
   - Verify your domain in Resend dashboard
   - Use a verified domain for FROM_EMAIL

3. **Rate Limiting**
   - Check Resend rate limits
   - Implement proper queuing for bulk emails

4. **Template Errors**
   - Validate HTML in email templates
   - Test with simple templates first

### Testing

Use the test endpoint to verify email service:

```bash
curl -X GET http://localhost:7000/api/email/test \
  -H "Authorization: Bearer <admin-token>"
```

## 📈 Best Practices

1. **Async Sending**: Email sending is non-blocking
2. **Error Handling**: Always handle email sending errors gracefully
3. **Template Testing**: Test templates with different data
4. **Bulk Email Limits**: Respect Resend's bulk email limits
5. **User Consent**: Ensure users have opted in for marketing emails

## 🔄 Integration Points

The email service is automatically integrated with:

- User registration (welcome email)
- Order processing (confirmation email)
- Tree adoption (adoption email)
- TUT token rewards (reward email)
- Admin notifications (marketplace email)

## 📝 Next Steps

1. Set up your Resend account
2. Configure environment variables
3. Test the email service
4. Customize email templates
5. Set up monitoring and logging
6. Implement email preferences for users
