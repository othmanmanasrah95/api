const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

class StripeService {
  constructor() {
    this.stripe = stripe;
  }

  /**
   * Create a payment intent for an order
   * @param {Object} orderData - Order information
   * @param {number} amount - Amount in cents
   * @param {string} currency - Currency code (e.g., 'jod', 'usd')
   * @param {string} customerEmail - Customer email
   * @returns {Promise<Object>} Payment intent object
   */
  async createPaymentIntent(orderData, amount, currency = 'usd', customerEmail) {
    try {
      // Validate amount
      if (!amount || amount <= 0) {
        throw new Error('Invalid amount: Amount must be greater than 0');
      }

      // Convert to cents and round to avoid floating point issues
      const amountInCents = Math.round(amount * 100);
      
      if (amountInCents < 50) {
        throw new Error(`Amount too small: Stripe requires minimum $0.50. Current: $${amount.toFixed(2)}`);
      }

      // Ensure currency is lowercase
      const normalizedCurrency = currency.toLowerCase();

      console.log('Creating Stripe Payment Intent:', {
        amount: amount,
        amountInCents: amountInCents,
        currency: normalizedCurrency,
        orderId: orderData.orderId
      });

      // Helper function to compress items for Stripe metadata (500 char limit per field)
      const compressItems = (items) => {
        // First pass: minimal compression (name, quantity, type, id)
        let compressed = items.map(item => ({
          n: item.name.substring(0, 40), // Truncate name to 40 chars
          q: item.quantity,
          t: item.type,
          id: item.productId || item.treeId || item.id
        }));
        
        let jsonStr = JSON.stringify(compressed);
        
        // If still too long, split into chunks
        if (jsonStr.length > 500) {
          const chunks = [];
          let chunk = [];
          let chunkLength = 1; // Start with '[' 
          
          for (const item of compressed) {
            const itemStr = JSON.stringify(item);
            const neededLength = chunkLength + itemStr.length + (chunk.length > 0 ? 1 : 0); // +1 for comma if not first
            
            if (neededLength > 500 && chunk.length > 0) {
              chunks.push(JSON.stringify(chunk));
              chunk = [item];
              chunkLength = itemStr.length + 1; // '[' + item
            } else {
              chunk.push(item);
              chunkLength = neededLength;
            }
          }
          
          if (chunk.length > 0) {
            chunks.push(JSON.stringify(chunk));
          }
          
          return { chunks, isChunked: true };
        }
        
        return { data: jsonStr, isChunked: false };
      };

      // Compress items
      const itemsData = compressItems(orderData.items);
      
      // Build metadata object
      const metadata = {
        orderId: orderData.orderId,
        userId: orderData.userId || '',
        customerEmail: customerEmail,
        customerName: `${orderData.customer.firstName} ${orderData.customer.lastName}`
      };
      
      // Add items (either single field or chunks)
      if (itemsData.isChunked) {
        metadata.itemCount = orderData.items.length.toString();
        metadata.itemsChunks = itemsData.chunks.length.toString();
        itemsData.chunks.forEach((chunk, index) => {
          metadata[`items_${index}`] = chunk;
        });
      } else {
        metadata.items = itemsData.data;
      }
      
      // Add shipping address (check length)
      const shippingStr = JSON.stringify(orderData.shipping);
      if (shippingStr.length <= 500) {
        metadata.shippingAddress = shippingStr;
      } else {
        // Store key shipping fields separately
        metadata.shippingCity = orderData.shipping.city || '';
        metadata.shippingCountry = orderData.shipping.country || '';
        metadata.shippingPostalCode = orderData.shipping.postalCode || '';
      }

      // Create payment intent with explicit configuration
      const paymentIntentParams = {
        amount: amountInCents,
        currency: normalizedCurrency,
        metadata: metadata,
        automatic_payment_methods: {
          enabled: true,
        },
        description: `Order #${orderData.orderId} - ${orderData.items.length} items`,
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic'
          }
        },
        // Explicitly set capture method (automatic means charge immediately when confirmed)
        capture_method: 'automatic'
        // Note: confirmation_method cannot be used with automatic_payment_methods
        // When using automatic_payment_methods, confirmation happens via client-side confirmCardPayment
      };

      console.log('Creating Stripe Payment Intent with params:', {
        amountInCents,
        currency: normalizedCurrency,
        orderId: orderData.orderId,
        params: paymentIntentParams
      });

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);

      console.log('Payment Intent created successfully:', {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        amountInDollars: (paymentIntent.amount / 100).toFixed(2),
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret ? 'present' : 'missing',
        created: paymentIntent.created
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      };
    } catch (error) {
      console.error('Stripe Payment Intent Creation Error:', {
        message: error.message,
        code: error.code,
        type: error.type,
        orderId: orderData.orderId,
        amount: amount,
        currency: currency
      });
      return {
        success: false,
        error: error.message,
        code: error.code,
        type: error.type
      };
    }
  }

  /**
   * Retrieve a payment intent by ID
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise<Object>} Payment intent object
   */
  async getPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return {
        success: true,
        paymentIntent: paymentIntent
      };
    } catch (error) {
      // If payment intent not found, return success: false
      if (error.code === 'resource_missing') {
        return {
          success: false,
          error: 'Payment intent not found',
          code: error.code,
          type: error.type
        };
      }
      console.error('Stripe Payment Intent Retrieval Error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code,
        type: error.type
      };
    }
  }

  /**
   * Confirm a payment intent
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise<Object>} Confirmation result
   */
  async confirmPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);
      return {
        success: true,
        paymentIntent: paymentIntent
      };
    } catch (error) {
      console.error('Stripe Payment Intent Confirmation Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cancel a payment intent
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);
      return {
        success: true,
        paymentIntent: paymentIntent
      };
    } catch (error) {
      console.error('Stripe Payment Intent Cancellation Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a refund for a payment
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @param {number} amount - Amount to refund in cents (optional, defaults to full refund)
   * @param {string} reason - Reason for refund
   * @returns {Promise<Object>} Refund result
   */
  async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      const refundData = {
        payment_intent: paymentIntentId,
        reason: reason
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await this.stripe.refunds.create(refundData);
      return {
        success: true,
        refund: refund
      };
    } catch (error) {
      console.error('Stripe Refund Creation Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Raw request body
   * @param {string} signature - Stripe signature header
   * @returns {Object} Event object or error
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      return {
        success: true,
        event: event
      };
    } catch (error) {
      console.error('Stripe Webhook Signature Verification Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get payment methods for a customer
   * @param {string} customerId - Stripe customer ID
   * @returns {Promise<Object>} Payment methods
   */
  async getCustomerPaymentMethods(customerId) {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      return {
        success: true,
        paymentMethods: paymentMethods.data
      };
    } catch (error) {
      console.error('Stripe Customer Payment Methods Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a customer in Stripe
   * @param {Object} customerData - Customer information
   * @returns {Promise<Object>} Customer object
   */
  async createCustomer(customerData) {
    try {
      const customer = await this.stripe.customers.create({
        email: customerData.email,
        name: `${customerData.firstName} ${customerData.lastName}`,
        phone: customerData.phone,
        metadata: {
          userId: customerData.userId,
          firstName: customerData.firstName,
          lastName: customerData.lastName
        }
      });

      return {
        success: true,
        customer: customer
      };
    } catch (error) {
      console.error('Stripe Customer Creation Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert amount to cents (Stripe format)
   * @param {number} amount - Amount in currency units
   * @returns {number} Amount in cents
   */
  toCents(amount) {
    return Math.round(amount * 100);
  }

  /**
   * Convert amount from cents to currency units
   * @param {number} cents - Amount in cents
   * @returns {number} Amount in currency units
   */
  fromCents(cents) {
    return cents / 100;
  }
}

module.exports = new StripeService();
