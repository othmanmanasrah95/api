const stripeService = require('../services/stripeService');
const Order = require('../models/order');
const orderService = require('../services/OrderService');
const emailService = require('../services/emailService');
const { validationResult } = require('express-validator');

class StripeController {
  /**
   * Create a payment intent for an order
   */
  async createPaymentIntent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('Validation errors in createPaymentIntent:', errors.array());
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { orderId, currency = 'usd' } = req.body;
      const userId = req.user ? req.user._id : null;

      console.log('Creating payment intent request:', {
        orderId,
        currency,
        userId: userId ? userId.toString() : 'guest',
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder'
      });

      // Find the order (allow guest checkout - user can be null)
      const orderQuery = { 
        _id: orderId, 
        status: 'pending'
      };
      
      // If user is logged in, verify they own the order
      // If guest, allow orders with null user
      if (userId) {
        orderQuery.user = userId;
      } else {
        orderQuery.$or = [
          { user: null },
          { user: { $exists: false } }
        ];
      }
      
      const order = await Order.findOne(orderQuery).populate('user', 'name email');

      if (!order) {
        console.error('Order not found:', {
          orderId,
          userId: userId ? userId.toString() : 'guest',
          query: orderQuery
        });
        return res.status(404).json({
          success: false,
          message: 'Order not found or not accessible'
        });
      }

      // Use the order total from database (which includes discount) instead of frontend amount
      // This ensures security and consistency - backend is the source of truth
      // Round to 2 decimal places to fix floating point precision issues
      const rawAmount = order.totals?.total || order.payment?.amount || 0;
      const orderAmount = Math.round(rawAmount * 100) / 100; // Round to 2 decimal places
      let orderCurrency = (order.payment?.currency || currency || 'usd').toLowerCase();

      // Validate order amount
      if (orderAmount <= 0) {
        console.error('Invalid order amount:', orderAmount, 'Order ID:', orderId);
        return res.status(400).json({
          success: false,
          message: 'Invalid order amount. Please contact support.'
        });
      }

      // Stripe minimum amount validation (minimum $0.50 USD or equivalent)
      const MINIMUM_AMOUNT = 0.50;
      if (orderAmount < MINIMUM_AMOUNT) {
        console.error('Order amount below Stripe minimum:', orderAmount, 'Order ID:', orderId);
        return res.status(400).json({
          success: false,
          message: `Order amount must be at least $${MINIMUM_AMOUNT}. Current amount: $${orderAmount.toFixed(2)}`
        });
      }

      // Ensure currency is lowercase for Stripe
      orderCurrency = orderCurrency.toLowerCase();
      
      console.log('Creating payment intent for order:', {
        orderId: order._id,
        amount: orderAmount,
        currency: orderCurrency,
        discount: order.totals?.discount || 0,
        subtotal: order.totals?.subtotal || 0
      });

      // Prepare order data for Stripe
      const orderData = {
        orderId: order._id.toString(),
        userId: userId ? String(userId) : null,
        items: order.items,
        customer: order.customer,
        shipping: order.shipping
      };

      // Check if Stripe is properly configured
      if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
        console.error('Stripe secret key not configured');
        return res.status(500).json({
          success: false,
          message: 'Payment service is not properly configured. Please contact support.'
        });
      }

      // Check if order already has a payment intent that's still valid
      let existingPaymentIntent = null;
      if (order.payment.transactionId) {
        try {
          existingPaymentIntent = await stripeService.getPaymentIntent(order.payment.transactionId);
          
          if (existingPaymentIntent && existingPaymentIntent.success) {
            const pi = existingPaymentIntent.paymentIntent;
            
            // Check if payment intent is still usable (not succeeded, canceled, or requires_payment_method)
            if (pi.status === 'requires_payment_method' || 
                pi.status === 'requires_confirmation' ||
                pi.status === 'requires_action' ||
                pi.status === 'processing') {
              
              // Verify the amount matches (in case order was updated)
              const existingAmount = pi.amount / 100; // Convert from cents
              const amountDifference = Math.abs(existingAmount - orderAmount);
              
              // If amount is close (within 0.01), reuse the existing payment intent
              if (amountDifference < 0.01 && pi.currency === orderCurrency) {
                console.log('Reusing existing payment intent:', {
                  paymentIntentId: pi.id,
                  status: pi.status,
                  amount: existingAmount,
                  orderAmount: orderAmount
                });
                
                return res.json({
                  success: true,
                  clientSecret: pi.client_secret,
                  paymentIntentId: pi.id,
                  amount: pi.amount,
                  currency: pi.currency,
                  reused: true
                });
              } else {
                console.log('Existing payment intent amount mismatch, creating new one:', {
                  existingAmount,
                  orderAmount,
                  difference: amountDifference
                });
                // Cancel the old payment intent since amount doesn't match
                try {
                  await stripeService.cancelPaymentIntent(pi.id);
                  console.log('Canceled old payment intent due to amount mismatch');
                } catch (cancelError) {
                  console.warn('Failed to cancel old payment intent:', cancelError.message);
                }
              }
            } else if (pi.status === 'succeeded' || pi.status === 'canceled') {
              // Payment intent is in a terminal state, create a new one
              console.log('Existing payment intent is in terminal state, creating new one:', {
                paymentIntentId: pi.id,
                status: pi.status
              });
            }
          }
        } catch (getError) {
          // Payment intent not found or error retrieving it, create a new one
          console.log('Could not retrieve existing payment intent, creating new one:', {
            paymentIntentId: order.payment.transactionId,
            error: getError.message
          });
        }
      }

      // Create payment intent using order total from database
      const result = await stripeService.createPaymentIntent(
        orderData,
        orderAmount,
        orderCurrency,
        order.customer.email
      );

      if (!result.success) {
        console.error('Payment intent creation failed:', {
          orderId: orderId,
          amount: orderAmount,
          currency: orderCurrency,
          error: result.error,
          code: result.code,
          type: result.type,
          stripeError: result.error
        });
        
        return res.status(400).json({
          success: false,
          message: result.error || 'Failed to create payment intent',
          error: result.error,
          code: result.code,
          type: result.type,
          details: {
            orderId: orderId,
            amount: orderAmount,
            currency: orderCurrency
          }
        });
      }

      // Cancel old payment intent if it exists and is different
      if (order.payment.transactionId && 
          order.payment.transactionId !== result.paymentIntentId) {
        try {
          await stripeService.cancelPaymentIntent(order.payment.transactionId);
          console.log('Canceled old payment intent:', order.payment.transactionId);
        } catch (cancelError) {
          // Ignore errors if payment intent is already canceled/not found
          console.warn('Could not cancel old payment intent (may already be canceled):', cancelError.message);
        }
      }

      // Update order with payment intent ID
      order.payment.transactionId = result.paymentIntentId;
      await order.save();

      res.json({
        success: true,
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
        amount: result.amount,
        currency: result.currency
      });

    } catch (error) {
      console.error('Create Payment Intent Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Confirm payment and update order status
   */
  async confirmPayment(req, res) {
    try {
      const { paymentIntentId } = req.body;
      const userId = req.user ? req.user._id : null;

      console.log('Confirming payment:', {
        paymentIntentId,
        userId: userId ? userId.toString() : 'guest'
      });

      // Get payment intent from Stripe
      const paymentResult = await stripeService.getPaymentIntent(paymentIntentId);
      
      if (!paymentResult.success) {
        console.error('Payment intent not found in Stripe:', paymentResult.error);
        return res.status(400).json({
          success: false,
          message: 'Payment intent not found',
          error: paymentResult.error
        });
      }

      const paymentIntent = paymentResult.paymentIntent;

      // Find the order - allow guest checkout (user can be null)
      const orderQuery = {
        'payment.transactionId': paymentIntentId
      };
      
      // If user is logged in, verify they own the order
      // If guest, allow orders with null user
      if (userId) {
        orderQuery.user = userId;
      } else {
        orderQuery.$or = [
          { user: null },
          { user: { $exists: false } }
        ];
      }

      const order = await Order.findOne(orderQuery);

      if (!order) {
        console.error('Order not found for payment intent:', {
          paymentIntentId,
          userId: userId ? userId.toString() : 'guest',
          query: orderQuery
        });
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Update order based on payment status
      if (paymentIntent.status === 'succeeded') {
        order.payment.status = 'completed';
        order.payment.transactionId = paymentIntentId;
        await order.save();
        
        // Update order status through service to trigger certificate emails
        await orderService.updateOrderStatus(order._id, 'confirmed');
        
        // Send order confirmation email after payment is confirmed
        try {
          // Refresh order to get latest data after status update
          const Order = require('../models/order');
          const refreshedOrder = await Order.findById(order._id);
          
          if (!refreshedOrder) {
            console.error('Order not found after status update');
            return res.json({
              success: true,
              message: 'Payment confirmed successfully',
              orderId: order._id,
              paymentStatus: 'completed'
            });
          }
          
          // For guest orders, use customer email from order
          // For logged-in users, try to get user details but fallback to order customer email
          let userEmail = refreshedOrder.customer?.email;
          let userName = `${refreshedOrder.customer?.firstName || ''} ${refreshedOrder.customer?.lastName || ''}`.trim() || 'Customer';
          
          if (refreshedOrder.user) {
            const User = require('../models/user');
            const user = await User.findById(refreshedOrder.user);
            if (user && user.email) {
              userEmail = user.email;
              userName = user.name || userName;
            }
          }
          
          if (userEmail) {
            await emailService.sendOrderConfirmationEmail({
              userEmail: userEmail,
              userName: userName,
              orderData: {
                orderNumber: refreshedOrder.orderNumber || refreshedOrder._id.toString(),
                items: refreshedOrder.items,
                totals: refreshedOrder.totals,
                shipping: refreshedOrder.shipping,
                payment: refreshedOrder.payment,
                status: refreshedOrder.status,
                customer: refreshedOrder.customer
              }
            });
          }
        } catch (emailError) {
          console.error('Failed to send order confirmation email:', emailError);
          // Don't fail the payment confirmation if email fails
        }

        res.json({
          success: true,
          message: 'Payment confirmed successfully',
          orderId: order._id,
          paymentStatus: 'completed'
        });
      } else if (paymentIntent.status === 'requires_payment_method') {
        res.json({
          success: false,
          message: 'Payment requires a valid payment method',
          paymentStatus: 'requires_payment_method'
        });
      } else {
        res.json({
          success: false,
          message: 'Payment not completed',
          paymentStatus: paymentIntent.status
        });
      }

    } catch (error) {
      console.error('Confirm Payment Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPayment(req, res) {
    try {
      const { paymentIntentId } = req.body;
      const userId = req.user._id;

      // Find the order
      const order = await Order.findOne({
        'payment.transactionId': paymentIntentId,
        user: userId
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Cancel payment intent in Stripe
      const result = await stripeService.cancelPaymentIntent(paymentIntentId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to cancel payment',
          error: result.error
        });
      }

      // Update order status
      order.payment.status = 'failed';
      order.status = 'cancelled';
      await order.save();

      res.json({
        success: true,
        message: 'Payment cancelled successfully',
        orderId: order._id
      });

    } catch (error) {
      console.error('Cancel Payment Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Create a refund
   */
  async createRefund(req, res) {
    try {
      const { paymentIntentId, amount, reason } = req.body;
      const userId = req.user._id;

      // Find the order
      const order = await Order.findOne({
        'payment.transactionId': paymentIntentId,
        user: userId
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Create refund in Stripe
      const result = await stripeService.createRefund(paymentIntentId, amount, reason);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to create refund',
          error: result.error
        });
      }

      // Update order status
      order.payment.status = 'refunded';
      order.status = 'refunded';
      await order.save();

      res.json({
        success: true,
        message: 'Refund created successfully',
        refundId: result.refund.id,
        amount: result.refund.amount,
        status: result.refund.status
      });

    } catch (error) {
      console.error('Create Refund Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Handle Stripe webhooks
   */
  async handleWebhook(req, res) {
    try {
      const signature = req.headers['stripe-signature'];
      
      // Payload must be a Buffer for Stripe signature verification
      // This is ensured by registering the webhook route BEFORE express.json() in app.js
      const payload = req.body;
      
      if (!Buffer.isBuffer(payload)) {
        console.error('Webhook payload is not a Buffer. Body type:', typeof payload, 'Is object:', typeof payload === 'object');
        return res.status(400).json({
          success: false,
          message: 'Webhook payload must be raw body. Check middleware order in app.js - webhook route must be registered BEFORE express.json()'
        });
      }

      // Verify webhook signature
      const verification = stripeService.verifyWebhookSignature(payload, signature);
      
      if (!verification.success) {
        console.error('Webhook signature verification failed:', verification.error);
        return res.status(400).json({
          success: false,
          message: 'Invalid signature'
        });
      }

      const event = verification.event;

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        
        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(event.data.object);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ success: true, received: true });

    } catch (error) {
      console.error('Webhook Error:', error);
      res.status(500).json({
        success: false,
        message: 'Webhook error',
        error: error.message
      });
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSucceeded(paymentIntent) {
    try {
      const order = await Order.findOne({
        'payment.transactionId': paymentIntent.id
      });

      if (order) {
        order.payment.status = 'completed';
        order.status = 'confirmed';
        await order.save();
        console.log(`Order ${order._id} payment confirmed via webhook`);
      } else {
        // Order was deleted - log for reference but don't error
        const orderId = paymentIntent.metadata?.orderId;
        console.warn(`Payment intent ${paymentIntent.id} succeeded but order ${orderId || 'unknown'} not found (may have been deleted)`);
      }
    } catch (error) {
      console.error('Handle Payment Succeeded Error:', error);
    }
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailed(paymentIntent) {
    try {
      const order = await Order.findOne({
        'payment.transactionId': paymentIntent.id
      });

      if (order) {
        order.payment.status = 'failed';
        order.status = 'cancelled';
        await order.save();
        console.log(`Order ${order._id} payment failed via webhook`);
      } else {
        // Order was deleted - log for reference but don't error
        const orderId = paymentIntent.metadata?.orderId;
        console.warn(`Payment intent ${paymentIntent.id} failed but order ${orderId || 'unknown'} not found (may have been deleted)`);
      }
    } catch (error) {
      console.error('Handle Payment Failed Error:', error);
    }
  }

  /**
   * Handle canceled payment
   */
  async handlePaymentCanceled(paymentIntent) {
    try {
      const order = await Order.findOne({
        'payment.transactionId': paymentIntent.id
      });

      if (order) {
        order.payment.status = 'failed';
        order.status = 'cancelled';
        await order.save();
        console.log(`Order ${order._id} payment canceled via webhook`);
      } else {
        // Order was deleted - log for reference but don't error
        const orderId = paymentIntent.metadata?.orderId;
        console.warn(`Payment intent ${paymentIntent.id} canceled but order ${orderId || 'unknown'} not found (may have been deleted)`);
      }
    } catch (error) {
      console.error('Handle Payment Canceled Error:', error);
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(req, res) {
    try {
      const { paymentIntentId } = req.params;
      const userId = req.user._id;

      // Find the order
      const order = await Order.findOne({
        'payment.transactionId': paymentIntentId,
        user: userId
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Get payment intent from Stripe
      const result = await stripeService.getPaymentIntent(paymentIntentId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to get payment status',
          error: result.error
        });
      }

      res.json({
        success: true,
        paymentStatus: result.paymentIntent.status,
        orderStatus: order.status,
        amount: result.paymentIntent.amount,
        currency: result.paymentIntent.currency
      });

    } catch (error) {
      console.error('Get Payment Status Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = new StripeController();


