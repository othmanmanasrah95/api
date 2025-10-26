require('dotenv').config();
const stripeService = require('../services/stripeService');

// Test Stripe service functionality
async function testStripeIntegration() {
  console.log('🧪 Testing Stripe Integration...\n');

  try {
    // Test 1: Check if Stripe is initialized
    console.log('1. Testing Stripe initialization...');
    if (process.env.STRIPE_SECRET_KEY) {
      console.log('✅ Stripe secret key is configured');
      console.log(`   Key starts with: ${process.env.STRIPE_SECRET_KEY.substring(0, 10)}...`);
    } else {
      console.log('❌ Stripe secret key is missing');
      console.log('\n🔧 To fix this:');
      console.log('1. Create a .env file in the api directory');
      console.log('2. Add: STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here');
      console.log('3. Get your key from: https://dashboard.stripe.com/test/apikeys');
      console.log('\n📋 Example .env file:');
      console.log('STRIPE_SECRET_KEY=sk_test_51ABC123...your_secret_key_here');
      console.log('STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...your_publishable_key_here');
      console.log('STRIPE_WEBHOOK_SECRET=whsec_1234567890...your_webhook_secret_here');
      return;
    }

    // Test 2: Test payment intent creation (with mock data)
    console.log('\n2. Testing payment intent creation...');
    const mockOrderData = {
      orderId: 'test_order_123',
      userId: 'test_user_123',
      items: [
        {
          id: 'item_1',
          name: 'Test Product',
          price: 10.00,
          quantity: 1
        }
      ],
      customer: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      },
      shipping: {
        address: '123 Test St',
        city: 'Test City',
        postalCode: '12345',
        country: 'Jordan'
      }
    };

    const result = await stripeService.createPaymentIntent(
      mockOrderData,
      10.00,
      'usd',
      'test@example.com'
    );

    if (result.success) {
      console.log('✅ Payment intent created successfully');
      console.log(`   Payment Intent ID: ${result.paymentIntentId}`);
      console.log(`   Client Secret: ${result.clientSecret.substring(0, 20)}...`);
    } else {
      console.log('❌ Payment intent creation failed');
      console.log(`   Error: ${result.error}`);
    }

    // Test 3: Test utility functions
    console.log('\n3. Testing utility functions...');
    const cents = stripeService.toCents(10.50);
    const amount = stripeService.fromCents(1050);
    
    if (cents === 1050 && amount === 10.50) {
      console.log('✅ Currency conversion functions working correctly');
    } else {
      console.log('❌ Currency conversion functions failed');
    }

    console.log('\n🎉 Stripe integration test completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Set up your Stripe account and get API keys');
    console.log('2. Update environment variables with your keys');
    console.log('3. Test the frontend integration');
    console.log('4. Set up webhooks in Stripe Dashboard');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if STRIPE_SECRET_KEY is set in environment');
    console.log('2. Verify the key format (should start with sk_test_ or sk_live_)');
    console.log('3. Ensure you have an active Stripe account');
  }
}

// Run the test
testStripeIntegration();
