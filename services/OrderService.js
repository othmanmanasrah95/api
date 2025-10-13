const BaseService = require('./BaseService');
const Order = require('../models/order');
const Product = require('../models/product');
const ProductVariant = require('../models/productVariant');
const User = require('../models/user');
const TokenBalance = require('../models/tokenBalance');
const TokenTransaction = require('../models/tokenTransaction');
const tutPaymentService = require('./tutPaymentService');
const constants = require('../config/constants');

class OrderService extends BaseService {
  constructor() {
    super(Order);
  }

  // Create a new order with business logic
  async createOrder(orderData, userId) {
    try {
      const { items, customer, shipping, payment, specialInstructions, isTutTransaction } = orderData;

      // Validate items and calculate totals
      const { orderItems, subtotal, tutSubtotal } = await this.validateAndCalculateItems(items);

      // Calculate shipping and tax
      const shippingCost = this.calculateShipping(subtotal, isTutTransaction);
      const tax = this.calculateTax(subtotal);
      const total = subtotal + shippingCost + tax;
      let tutTotal = tutSubtotal;

      // Validate TUT transaction requirements
      if (isTutTransaction) {
        await this.validateTutTransaction(userId);
        
        // For TUT transactions, use the payment amount from frontend if provided
        if (payment.amount && payment.currency === 'TUT') {
          tutTotal = payment.amount;
        }
      }

      // Create order
      const order = await this.create({
        user: userId,
        items: orderItems,
        customer: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone
        },
        shipping: {
          address: shipping.address,
          city: shipping.city,
          postalCode: shipping.postalCode,
          country: shipping.country
        },
        payment: {
          method: payment.method,
          amount: isTutTransaction ? tutTotal : total,
          currency: isTutTransaction ? 'TUT' : payment.currency || 'JOD',
          status: isTutTransaction ? 'pending' : 'pending'
        },
        specialInstructions: specialInstructions || '',
        totals: {
          subtotal,
          shipping: shippingCost,
          tax,
          total: isTutTransaction ? tutTotal : total,
          tutTotal: tutTotal
        },
        status: constants.ORDER_STATUS.PENDING,
        isTutTransaction: !!isTutTransaction
      });

      // If TUT transaction, deduct TUT from user's wallet balance
      if (isTutTransaction && tutTotal > 0) {
        await this.deductTutFromWallet(userId, tutTotal, order._id);
      }

      return order;
    } catch (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  // Validate items and calculate totals
  async validateAndCalculateItems(items) {
    let subtotal = 0;
    let tutSubtotal = 0;
    const orderItems = [];

    for (const item of items) {
      let product;
      let productData;

      if (item.type === 'product') {
        if (item.id.startsWith('variant_')) {
          const variantId = item.id.replace('variant_', '');
          const variant = await ProductVariant.findById(variantId).populate('product');
          
          if (!variant) {
            throw new Error(`Product variant not found: ${item.id}`);
          }
          
          product = variant.product;
          productData = {
            productId: product._id.toString(),
            variantId: variant._id.toString(),
            name: `${product.name} - ${variant.name}`,
            price: variant.price,
            tutPrice: variant.tutPrice
          };
        } else {
          product = await Product.findById(item.id);
          
          if (!product) {
            throw new Error(`Product not found: ${item.id}`);
          }
          
          productData = {
            productId: product._id.toString(),
            name: product.name,
            price: product.price,
            tutPrice: product.tutPrice
          };
        }
      } else if (item.type === 'tree') {
        // Handle tree items if needed
        throw new Error('Tree items not yet implemented');
      } else {
        throw new Error(`Invalid item type: ${item.type}`);
      }

      const itemTotal = productData.price * item.quantity;
      const itemTutTotal = (productData.tutPrice || 0) * item.quantity;

      subtotal += itemTotal;
      tutSubtotal += itemTutTotal;

      orderItems.push({
        ...productData,
        quantity: item.quantity,
        type: item.type,
        purchaseMethod: item.purchaseMethod || 'money',
        tutRewardPercent: item.tutRewardPercent || 0,
        tutRewardFixed: item.tutRewardFixed || 0
      });
    }

    return { orderItems, subtotal, tutSubtotal };
  }

  // Calculate shipping cost
  calculateShipping(subtotal, isTutTransaction) {
    if (isTutTransaction || subtotal > constants.FREE_SHIPPING_THRESHOLD) {
      return 0;
    }
    return constants.SHIPPING_COST;
  }

  // Calculate tax
  calculateTax(subtotal) {
    return subtotal * constants.TAX_RATE;
  }

  // Validate TUT transaction requirements
  async validateTutTransaction(userId) {
    const user = await User.findById(userId);
    if (!user || !user.walletAddress) {
      throw new Error('Wallet address not found. Please connect your wallet to use TUT payment.');
    }
    return user;
  }

  // Deduct TUT from user's wallet balance
  async deductTutFromWallet(userId, amount, orderId) {
    try {
      // Find or create token balance record
      let tokenBalance = await TokenBalance.findOne({ user: userId });
      
      if (!tokenBalance) {
        tokenBalance = new TokenBalance({
          user: userId,
          balance: 0
        });
      }

      // Check if user has sufficient balance
      if (tokenBalance.balance < amount) {
        throw new Error(`Insufficient TUT balance. You have ${tokenBalance.balance} TUT but need ${amount} TUT.`);
      }

      // Deduct the amount from balance
      tokenBalance.balance = Math.max(0, tokenBalance.balance - amount);

      // Add transaction record
      tokenBalance.transactions.push({
        type: 'purchase',
        amount: -amount, // Negative amount for deduction
        description: `TUT payment for order ${orderId}`,
        reference: orderId,
        referenceType: 'order',
        date: new Date()
      });

      await tokenBalance.save();

      // Create token transaction record
      const tokenTransaction = new TokenTransaction({
        user: userId,
        type: 'purchase',
        amount: amount,
        description: `TUT payment for order ${orderId}`,
        reference: orderId,
        status: 'completed'
      });

      await tokenTransaction.save();

      console.log(`✅ Deducted ${amount} TUT from user ${userId} for order ${orderId}`);
      return true;

    } catch (error) {
      console.error('Error deducting TUT from wallet:', error);
      throw error;
    }
  }

  // Get user orders with pagination
  async getUserOrders(userId, options = {}) {
    try {
      const filter = { user: userId };
      return await this.findAll({ ...options, filter });
    } catch (error) {
      throw new Error(`Failed to get user orders: ${error.message}`);
    }
  }

  // Update order status
  async updateOrderStatus(orderId, status, trackingNumber = null) {
    try {
      const updateData = { status };
      if (trackingNumber) {
        updateData.trackingNumber = trackingNumber;
      }

      return await this.updateById(orderId, updateData);
    } catch (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }

  // Get order statistics
  async getOrderStatistics(filter = {}) {
    try {
      const pipeline = [
        { $match: filter },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' },
            statusCounts: {
              $push: '$status'
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalOrders: 1,
            totalRevenue: 1,
            averageOrderValue: { $round: ['$averageOrderValue', 2] },
            statusBreakdown: {
              $reduce: {
                input: '$statusCounts',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [
                        [{ k: '$$this', v: { $add: [{ $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] }, 1] } }]
                      ]
                    }
                  ]
                }
              }
            }
          }
        }
      ];

      const result = await this.model.aggregate(pipeline);
      return result[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        statusBreakdown: {}
      };
    } catch (error) {
      throw new Error(`Failed to get order statistics: ${error.message}`);
    }
  }

  // Get orders by date range
  async getOrdersByDateRange(startDate, endDate, options = {}) {
    try {
      const filter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        },
        ...options.filter
      };

      return await this.findAll({ ...options, filter });
    } catch (error) {
      throw new Error(`Failed to get orders by date range: ${error.message}`);
    }
  }
}

module.exports = new OrderService();
