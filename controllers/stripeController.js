const stripeService = require('../services/stripeService');
const Order = require('../models/order');
const orderService = require('../services/OrderService'); 
const { validationResult } = require('express-validator');

class StripeController {
  /**
   * Create a payment intent for an order
   */
  async createPaymentIntent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { orderId, amount, currency = 'jod' } = req.body;
      const userId = req.user._id;

      // Find the order
      const order = await Order.findOne({ 
        _id: orderId, 
        user: userId,
        status: 'pending'
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found or not accessible'
        });
      }

      // Prepare order data for Stripe
      const orderData = {
        orderId: order._id.toString(),
        userId: userId,
        items: order.items,
        customer: order.customer,
        shipping: order.shipping
      };

      // Create payment intent
      const result = await stripeService.createPaymentIntent(
        orderData,
        amount,
        currency,
        order.customer.email
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to create payment intent',
          error: result.error
        });
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
      const userId = req.user._id;

      // Get payment intent from Stripe
      const paymentResult = await stripeService.getPaymentIntent(paymentIntentId);
      
      if (!paymentResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Payment intent not found',
          error: paymentResult.error
        });
      }

      const paymentIntent = paymentResult.paymentIntent;

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

      // Update order based on payment status
      if (paymentIntent.status === 'succeeded') {
        order.payment.status = 'completed';
        order.payment.transactionId = paymentIntentId;
        await order.save();
        
        // Update order status through service to trigger certificate emails
        await orderService.updateOrderStatus(order._id, 'confirmed');

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
      const payload = req.body;

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


