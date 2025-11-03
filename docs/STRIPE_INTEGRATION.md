# Stripe Payment Gateway Integration Guide

## Overview
This guide explains how to set up and use the Stripe payment gateway integration in your Zeituna application.

## Prerequisites
1. Stripe account (https://stripe.com)
2. Stripe API keys (test and live)
3. Node.js and npm installed

## Backend Setup

### 1. Environment Variables
Add the following environment variables to your `.env` file in the `api` directory:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 2. Dependencies Installed
- `stripe` - Stripe Node.js SDK

### 3. Files Created/Modified
- `api/services/stripeService.js` - Stripe service for payment processing
- `api/controllers/stripeController.js` - Stripe payment controller
- `api/routes/stripeRoutes.js` - Stripe API routes
- `api/app.js` - Added Stripe routes
- `api/models/order.js` - Added 'stripe' to payment method enum
- `api/server.js` - Added Stripe environment variable validation

## Frontend Setup

### 1. Dependencies Installed
- `@stripe/stripe-js` - Stripe JavaScript SDK
- `@stripe/react-stripe-js` - Stripe React components

### 2. Environment Variables
Add the following environment variable to your `.env` file in the `Client` directory:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### 3. Files Created/Modified
- `Client/src/services/stripeService.ts` - Frontend Stripe service
- `Client/src/components/StripePayment.tsx` - Stripe payment component
- `Client/src/pages/Checkout.tsx` - Integrated Stripe payment option

## API Endpoints

### Stripe Payment Endpoints
- `POST /api/stripe/create-payment-intent` - Create payment intent
- `POST /api/stripe/confirm-payment` - Confirm payment
- `POST /api/stripe/cancel-payment` - Cancel payment
- `POST /api/stripe/create-refund` - Create refund
- `GET /api/stripe/payment-status/:paymentIntentId` - Get payment status
- `POST /api/stripe/webhook` - Stripe webhook handler

## Usage

### 1. Test Mode Setup
1. Get your test API keys from Stripe Dashboard
2. Update environment variables with test keys
3. Use test card numbers for testing:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Requires authentication: `4000 0025 0000 3155`

### 2. Production Setup
1. Get your live API keys from Stripe Dashboard
2. Update environment variables with live keys
3. Set up webhook endpoints in Stripe Dashboard
4. Configure webhook events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`

### 3. Webhook Configuration
1. In Stripe Dashboard, go to Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`
4. Copy the webhook secret to your environment variables

## Payment Flow

### Stripe Payment Process
1. User selects "Credit/Debit Card (Stripe)" payment method
2. User fills out checkout form and submits
3. Order is created with "pending" status
4. Stripe payment intent is created
5. User enters card details in Stripe Elements
6. Payment is processed by Stripe
7. Webhook updates order status to "confirmed"
8. User sees success message

### Error Handling
- Payment failures are handled gracefully
- Users can retry payments
- Failed payments don't create confirmed orders
- Webhook ensures order status consistency

## Security Features

### 1. PCI Compliance
- Card details never touch your servers
- Stripe handles all sensitive data
- PCI DSS compliance maintained

### 2. Webhook Security
- Webhook signatures are verified
- Only legitimate Stripe events are processed
- Replay attack protection

### 3. Environment Security
- API keys stored in environment variables
- Different keys for test and production
- No sensitive data in code

## Testing

### 1. Test Cards
Use Stripe's test card numbers:
- `4242 4242 4242 4242` - Visa (success)
- `4000 0000 0000 0002` - Visa (declined)
- `4000 0025 0000 3155` - Visa (requires authentication)

### 2. Test Scenarios
- Successful payment
- Declined payment
- Insufficient funds
- Network errors
- Webhook failures

## Troubleshooting

### Common Issues
1. **Invalid API Key**: Check environment variables
2. **Webhook failures**: Verify webhook secret and endpoint
3. **Payment failures**: Check Stripe Dashboard for error details
4. **CORS issues**: Ensure frontend URL is configured in Stripe

### Debug Steps
1. Check server logs for Stripe errors
2. Verify environment variables are loaded
3. Test API endpoints with Postman
4. Check Stripe Dashboard for payment attempts

## Support

For Stripe-specific issues:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

For application-specific issues:
- Check server logs
- Verify database connections
- Test API endpoints


