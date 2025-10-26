# Stripe Webhook Setup Guide

## Overview
This guide explains how to set up Stripe webhooks to receive real-time notifications about payment events.

## Why Webhooks?
Stripe webhooks allow your application to receive real-time updates about payment status changes. This ensures your order status stays synchronized with actual payment events, even if users close their browser before the payment completes.

## Current Webhook Implementation

### Endpoint
- **URL**: `https://yourdomain.com/api/stripe/webhook`
- **Method**: POST
- **No Authentication Required** (signature verification provides security)

### Events Handled
Your webhook currently handles these events:
1. `payment_intent.succeeded` - When a payment is successfully completed
2. `payment_intent.payment_failed` - When a payment fails
3. `payment_intent.canceled` - When a payment is canceled

## Setup Instructions

### Step 1: Navigate to Stripe Dashboard

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Test Mode** (toggle in top-right corner)
3. Click on **"Developers"** in the left sidebar
4. Click on **"Webhooks"**

### Step 2: Add Webhook Endpoint

1. Click the **"Add endpoint"** button
2. Enter your webhook URL:
   ```
   https://yourdomain.com/api/stripe/webhook
   ```
   
   **Note**: Replace `yourdomain.com` with your actual domain
   
   **For Local Testing (using ngrok)**:
   ```
   https://your-ngrok-url.ngrok.io/api/stripe/webhook
   ```

3. Select the events to listen to:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `payment_intent.canceled`

4. Click **"Add endpoint"**

### Step 3: Get Webhook Secret

1. After creating the endpoint, click on it to view details
2. Find the **"Signing secret"** section
3. Click **"Reveal"** to see your webhook secret (starts with `whsec_...`)
4. Copy this secret

### Step 4: Configure Environment Variable

Add the webhook secret to your `.env` file:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Important**: Never commit this to version control!

### Step 5: Test the Webhook

#### Using Stripe Dashboard

1. In the Stripe Dashboard, go to your webhook endpoint
2. Click **"Send test webhook"**
3. Select an event type (e.g., `payment_intent.succeeded`)
4. Click **"Send test webhook"**

#### Using Your Application

1. Create a test order with Stripe payment
2. Use test card: `4242 4242 4242 4242`
3. Complete the payment
4. Check your server logs for webhook confirmation

#### Verify Webhook is Working

You should see in your server logs:
```
Order <order_id> payment confirmed via webhook
```

## Local Development with ngrok

For local testing, you'll need to expose your local server to the internet:

### Install ngrok
```bash
# Download from https://ngrok.com/download
# Or using npm
npm install -g ngrok
```

### Start ngrok
```bash
ngrok http 7000
```

This will give you a public URL like:
```
https://abc123def456.ngrok.io
```

### Update Stripe Webhook URL
Use the ngrok URL in your Stripe webhook configuration:
```
https://abc123def456.ngrok.io/api/stripe/webhook
```

## Production Setup

For production, you'll need:

1. **Dedicated webhook endpoint** - Use your production domain
2. **HTTPS** - Required by Stripe
3. **Production API keys** - Update your `.env` with live keys
4. **Separate webhook secret** - Get from Stripe Dashboard (Live mode)

### Production Environment Variables
```env
STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret_here
```

## Webhook Flow

```
User completes payment
         ↓
Stripe processes payment
         ↓
Stripe sends webhook to your server
         ↓
Server verifies webhook signature
         ↓
Server updates order status in database
         ↓
User sees updated order status
```

## Security Features

### 1. Signature Verification
Your webhook endpoint verifies that the request actually came from Stripe using cryptographic signatures.

### 2. No Authentication Required
The webhook endpoint doesn't require user authentication because Stripe's signature verification provides security.

### 3. Event Handling
Each event type is handled by a specific function:
- `handlePaymentSucceeded()` - Updates order to confirmed
- `handlePaymentFailed()` - Updates order to cancelled
- `handlePaymentCanceled()` - Updates order to cancelled

## Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook URL** - Make sure it's accessible from the internet
2. **Check signature verification** - Ensure `STRIPE_WEBHOOK_SECRET` is correct
3. **Check server logs** - Look for errors in webhook handler
4. **Test with Stripe Dashboard** - Use "Send test webhook" feature

### Common Issues

**Error: "Invalid signature"**
- Solution: Check that `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe Dashboard

**Error: "Order not found"**
- Solution: Make sure the payment intent ID matches the order's transaction ID

**Error: "Webhook not responding"**
- Solution: Check that your server is running and accessible
- For local development, use ngrok to expose your server

### Debug Logs

Check your server logs for:
- Webhook signature verification results
- Event types received
- Order update confirmations
- Error messages

## Testing Checklist

- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Webhook secret added to `.env` file
- [ ] Test webhook sent from Stripe Dashboard
- [ ] Server logs show webhook received
- [ ] Order status updates after payment
- [ ] Test with actual payment using test cards

## Additional Resources

- [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
- [Testing Webhooks Locally](https://stripe.com/docs/webhooks/test)
- [Webhook Security](https://stripe.com/docs/webhooks/signatures)
- [ngrok Setup Guide](https://ngrok.com/docs/getting-started)

## Support

For issues with webhook integration, check:
1. Server logs for error messages
2. Stripe Dashboard webhook logs
3. Webhook delivery history in Stripe Dashboard
4. Network connectivity and firewall settings
