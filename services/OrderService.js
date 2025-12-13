const BaseService = require('./BaseService');
const Order = require('../models/order');
const Product = require('../models/product');
const ProductVariant = require('../models/productVariant');
const Tree = require('../models/tree');
const User = require('../models/user');
const TokenBalance = require('../models/tokenBalance');
const TokenTransaction = require('../models/tokenTransaction');
const Discount = require('../models/discount');
const tutPaymentService = require('./tutPaymentService');
const constants = require('../config/constants');
const emailService = require('../services/emailService');
const TAX_RATE = constants.TAX_RATE || 0.08;

class OrderService extends BaseService {
  constructor() {
    super(Order);
  }

  // Create a new order with business logic
  async createOrder(orderData, userId) {
    try {
      const { items, customer, shipping, payment, referredBy, isTutTransaction, discountCode } = orderData;

      // Validate items and calculate totals
      const { orderItems, subtotal, tutSubtotal } = await this.validateAndCalculateItems(items);

      // Calculate shipping
      const shippingCost = this.calculateShipping(subtotal, isTutTransaction);
      let discountAmount = 0;
      let discount = null;

      // Apply discount code if provided (before tax calculation)
      if (discountCode && !isTutTransaction) {
        try {
          discount = await Discount.findOne({ 
            code: discountCode.toUpperCase(),
            status: 'active'
          });

          if (!discount) {
            throw new Error('Invalid or expired discount code');
          }

          // Check if discount is valid
          if (!discount.isValid) {
            throw new Error('Discount code is no longer valid');
          }

          // Check if user can use this discount (if it's user-specific)
          // Guest users cannot use user-specific discounts
          if (discount.user) {
            if (!userId) {
              throw new Error('This discount code requires an account. Please log in to use it.');
            }
            if (discount.user.toString() !== userId.toString()) {
              throw new Error('This discount code is not available for your account');
            }
          }

          // Check minimum order amount
          if ((subtotal + shippingCost) < discount.minOrderAmount) {
            throw new Error(`Minimum order amount of $${discount.minOrderAmount} required for this discount`);
          }

          // Calculate discount amount based on subtotal + shipping (before tax)
          const discountableAmount = subtotal + shippingCost;
          discountAmount = discount.calculateDiscount(discountableAmount);
          
          if (discountAmount === 0) {
            throw new Error('Discount cannot be applied to this order');
          }

          // Validate that discount won't make total below Stripe minimum ($0.50)
          // Since tax = amountAfterDiscount * TAX_RATE
          // Total = amountAfterDiscount + tax = amountAfterDiscount * (1 + TAX_RATE)
          // For minimum: MINIMUM_TOTAL = amountAfterDiscount * (1 + TAX_RATE)
          // So: minAmountAfterDiscount = MINIMUM_TOTAL / (1 + TAX_RATE)
          // maxDiscount = discountableAmount - minAmountAfterDiscount
          const MINIMUM_TOTAL = 0.50;
          const TAX_RATE = constants.TAX_RATE || 0.08;
          
          if (!isTutTransaction) {
            // Calculate minimum amount after discount (before tax) needed to meet Stripe minimum
            const minAmountAfterDiscount = MINIMUM_TOTAL / (1 + TAX_RATE);
            const maxDiscountAmount = Math.max(0, discountableAmount - minAmountAfterDiscount);
            
            // Check if discount would make total too small
            const amountAfterDiscount = Math.max(0, discountableAmount - discountAmount);
            const estimatedTax = this.calculateTax(amountAfterDiscount);
            const estimatedTotal = amountAfterDiscount + estimatedTax;
            
            if (estimatedTotal < MINIMUM_TOTAL && estimatedTotal > 0) {
              if (maxDiscountAmount <= 0) {
                throw new Error(`This discount cannot be applied. The order total would be below the minimum payment amount of $${MINIMUM_TOTAL}.`);
              }
              
              // Cap the discount to the maximum allowed
              if (discountAmount > maxDiscountAmount) {
                console.warn(`Discount ${discount.code} would make total too small ($${estimatedTotal.toFixed(2)}). Capping discount from $${discountAmount.toFixed(2)} to $${maxDiscountAmount.toFixed(2)}`);
                discountAmount = maxDiscountAmount;
              }
            }
          }
          
        } catch (discountError) {
          console.error('Error applying discount code:', discountError);
          // Throw error to prevent order creation with invalid discount
          throw new Error(`Discount code error: ${discountError.message}`);
        }
      }

      // Calculate tax on discounted amount (subtotal + shipping - discount)
      const amountAfterDiscount = Math.max(0, subtotal + shippingCost - discountAmount);
      const tax = this.calculateTax(amountAfterDiscount);
      let total = amountAfterDiscount + tax;
      let tutTotal = tutSubtotal;

      // Final validation that total meets Stripe minimum
      if (!isTutTransaction) {
        const MINIMUM_TOTAL = 0.50;
        if (total > 0 && total < MINIMUM_TOTAL) {
          throw new Error(`Order total ($${total.toFixed(2)}) is below the minimum payment amount of $${MINIMUM_TOTAL}. Please adjust your order or discount.`);
        }
      }

      // Validate TUT transaction requirements
      // Guest users cannot use TUT transactions
      if (isTutTransaction) {
        if (!userId) {
          throw new Error('TUT transactions require an account. Please log in to use TUT tokens.');
        }
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
          currency: isTutTransaction ? 'TUT' : (payment.currency || 'USD').toUpperCase(),
          status: isTutTransaction ? 'pending' : 'pending'
        },
        referredBy: referredBy || 'none',
        totals: {
          subtotal,
          shipping: shippingCost,
          tax,
          discount: discountAmount,
          total: isTutTransaction ? tutTotal : total,
          tutTotal: tutTotal
        },
        status: constants.ORDER_STATUS.PENDING,
        isTutTransaction: !!isTutTransaction,
        discountCode: discountCode || undefined
      });

      // Note: Discount is applied to order total, but not marked as "used" yet
      // It will be marked as used when payment is confirmed (in order status update)
      if (discount && discountAmount > 0) {
        console.log(`✅ Applied discount code ${discount.code} (${discountAmount}) to order ${order._id}`);
      }

      // If TUT transaction, deduct TUT from user's wallet balance
      if (isTutTransaction && tutTotal > 0) {
        await this.deductTutFromWallet(userId, tutTotal, order._id);
      }

      // Send order confirmation email to the buyer (person who placed the order)
      // This should always be sent to order.customer.email, regardless of login status
      try {
        const buyerEmail = order.customer?.email;
        const buyerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Customer';
        
        if (buyerEmail) {
          // Always send order confirmation to the buyer
          await emailService.sendOrderConfirmationEmail({
            userEmail: buyerEmail,
            userName: buyerName,
            orderData: {
              orderNumber: order.orderNumber || order._id.toString(),
              items: order.items,
              totals: order.totals,
              shipping: order.shipping,
              payment: order.payment,
              status: order.status,
              customer: order.customer
            }
          });

          // For logged-in users, also check for milestones
          if (userId) {
            const user = await User.findById(userId);
            if (user && user.email) {
              // Check if this is user's first order
              const userOrderCount = await this.model.countDocuments({ user: userId });
              if (userOrderCount === 1) {
                try {
                  await emailService.sendFirstOrderEmail({
                    userEmail: user.email,
                    userName: user.name,
                    orderData: {
                      orderNumber: order.orderNumber || order._id.toString()
                    }
                  });
                } catch (e) {
                  console.error('Failed to send first order email:', e);
                }
              }

              // Check for order milestones (10, 25, 50, 100)
              const milestones = [10, 25, 50, 100];
              if (milestones.includes(userOrderCount)) {
                try {
                  await emailService.sendOrderMilestoneEmail({
                    userEmail: user.email,
                    userName: user.name,
                    milestoneData: {
                      orderCount: userOrderCount
                    }
                  });
                } catch (e) {
                  console.error('Failed to send order milestone email:', e);
                }
              }
            }
          }
        }
      } catch (emailError) {
        console.error('Failed to send order confirmation email:', emailError);
        // Don't fail the order creation if email fails
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
        // Handle product variants (olive oil, etc.)
        if (item.id && item.id.startsWith('variant_')) {
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
        } else if (item.id && item.id.startsWith('olive-oil-')) {
          // Handle olive oil product IDs that might not have variant_ prefix
          const cleanId = item.id.replace('olive-oil-', '');
          // Try to find as variant first
          let variant = await ProductVariant.findById(cleanId).populate('product');
          if (variant) {
            product = variant.product;
            productData = {
              productId: product._id.toString(),
              variantId: variant._id.toString(),
              name: `${product.name} - ${variant.name}`,
              price: variant.price,
              tutPrice: variant.tutPrice
            };
          } else {
            // Fallback to product lookup
            product = await Product.findById(cleanId);
            if (!product) {
              // Use frontend-provided data as fallback
              productData = {
                productId: cleanId || item.id,
                name: item.name || 'Product',
                price: item.price,
                tutPrice: item.tutPrice || null
              };
            } else {
              productData = {
                productId: product._id.toString(),
                name: product.name,
                price: product.price,
                tutPrice: product.tutPrice
              };
            }
          }
        } else {
          // Regular product lookup
          product = await Product.findById(item.id);
          
          if (!product) {
            // Use frontend-provided data as fallback for mixed carts
            productData = {
              productId: item.id,
              name: item.name || 'Product',
              price: item.price,
              tutPrice: item.tutPrice || null
            };
          } else {
            productData = {
              productId: product._id.toString(),
              name: product.name,
              price: product.price,
              tutPrice: product.tutPrice
            };
          }
        }
      } else if (item.type === 'tree') {
        // Tree adoption item
        const cleanTreeId = String(item.id || '').replace(/^variant_/, '');
        let tree = null;
        try { tree = await Tree.findById(cleanTreeId); } catch (_) { /* ignore malformed id */ }

        if (tree) {
          productData = {
            treeId: tree._id.toString(),
            name: `Tree Adoption - ${tree.name}`,
            price: tree.adoptionPrice,
            tutPrice: null
          };
        } else {
          // Fallback: allow creating an order even if the tree record isn't present
          // Use frontend-provided name/price so checkout doesn't hard-fail
          productData = {
            treeId: cleanTreeId || undefined,
            name: item.name || 'Tree Adoption',
            price: item.price,
            tutPrice: null
          };
        }
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
        tutRewardFixed: item.tutRewardFixed || 0,
        adoptionFor: item.adoptionFor || 'self',
        giftRecipientName: item.giftRecipientName || '',
        giftRecipientEmail: item.giftRecipientEmail || ''
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
      const updated = await this.updateById(orderId, updateData);
      
      // If order is confirmed and has a discount code, mark it as used
      if (status === constants.ORDER_STATUS.CONFIRMED && updated.discountCode) {
        try {
          const discount = await Discount.findOne({ 
            code: updated.discountCode.toUpperCase()
          });
          
          if (discount) {
            // Mark discount as used (increment usage and link to order)
            // This ensures the discount is only marked as used after successful payment
            const userId = updated.user._id || updated.user;
            
            // Use the useDiscount method which handles usage tracking
            try {
              await discount.useDiscount(userId, orderId);
              console.log(`✅ Marked discount code ${discount.code} as used for order ${orderId}`);
            } catch (useError) {
              // If discount is already used or invalid, log but don't fail
              console.warn(`Discount ${discount.code} could not be marked as used: ${useError.message}`);
            }
          }
        } catch (discountError) {
          console.error('Error marking discount as used:', discountError);
          // Don't fail order status update if discount marking fails
        }
      }

      // Send email notification for status change
      try {
        await updated.populate('user');
        if (updated.user && updated.user.email) {
          // Send status update email
          await emailService.sendOrderStatusUpdateEmail({
            userEmail: updated.user.email,
            userName: updated.user.name,
            orderData: {
              orderNumber: updated.orderNumber || updated._id.toString(),
              status: updated.status,
              trackingNumber: updated.trackingNumber,
              items: updated.items,
              totals: updated.totals
            }
          });

          // Send specific milestone emails for important status changes
          if (status === constants.ORDER_STATUS.CONFIRMED && updated.payment?.status === 'completed') {
            try {
              await emailService.sendPaymentSuccessEmail({
                userEmail: updated.user.email,
                userName: updated.user.name,
                orderData: {
                  orderNumber: updated.orderNumber || updated._id.toString(),
                  totals: updated.totals
                }
              });
            } catch (e) {
              console.error('Failed to send payment success email:', e);
            }
          }

          if (status === 'shipped') {
            try {
              await emailService.sendOrderShippedEmail({
                userEmail: updated.user.email,
                userName: updated.user.name,
                orderData: {
                  orderNumber: updated.orderNumber || updated._id.toString(),
                  trackingNumber: updated.trackingNumber
                }
              });
            } catch (e) {
              console.error('Failed to send order shipped email:', e);
            }
          }

          if (status === 'delivered') {
            try {
              await emailService.sendOrderDeliveredEmail({
                userEmail: updated.user.email,
                userName: updated.user.name,
                orderData: {
                  orderNumber: updated.orderNumber || updated._id.toString()
                }
              });
            } catch (e) {
              console.error('Failed to send order delivered email:', e);
            }
          }
        }
      } catch (emailError) {
        console.error('Failed to send order status update email:', emailError);
      }

      // When an order is confirmed, send adoption certificates if applicable
      if (updated && status === constants.ORDER_STATUS.CONFIRMED) {
        try {
          await this.sendCertificatesIfNeeded(updated);
        } catch (e) {
          console.error('Failed to send adoption certificates:', e);
        }
      }

      return updated;
    } catch (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }

  async sendCertificatesIfNeeded(order) {
    const treeItems = (order.items || []).filter(i => i.type === 'tree');
    if (treeItems.length === 0) return;

    for (const item of treeItems) {
      // Load tree info for richer certificate details
      let tree = null;
      if (item.treeId) {
        try { tree = await Tree.findById(item.treeId); } catch (_) { /* ignore */ }
      }
      const treeInfo = tree ? {
        name: tree.name,
        location: tree.location,
        species: tree.species
      } : { name: item.name?.replace('Tree Adoption - ', ''), location: 'Palestine', species: 'Olive' };

      const adopterName = `${order.customer.firstName} ${order.customer.lastName}`.trim();

      if (item.adoptionFor === 'gift' && item.giftRecipientEmail) {
        // For gifts: Send certificate ONLY to the recipient
        // The buyer already received order confirmation email
        await emailService.sendAdoptionCertificateEmail({
          recipientEmail: item.giftRecipientEmail,
          recipientName: item.giftRecipientName || 'Friend',
          adopterName,
          treeInfo,
          isGift: true
        });
      } else {
        // For self adoption: Send certificate to the buyer/adopter
        await emailService.sendAdoptionCertificateEmail({
          recipientEmail: order.customer.email,
          recipientName: adopterName,
          adopterName,
          treeInfo,
          isGift: false
        });

        // Check if this is user's first tree adoption
        try {
          await order.populate('user');
          if (order.user) {
            const userTreeCount = order.user.adoptedTrees?.length || 0;
            if (userTreeCount === 1) {
              await emailService.sendFirstTreeAdoptionEmail({
                userEmail: order.customer.email,
                userName: adopterName,
                treeData: treeInfo
              });
            }

            // Check for tree adoption milestones (5, 10, 25)
            const treeMilestones = [5, 10, 25];
            if (treeMilestones.includes(userTreeCount)) {
              await emailService.sendTreeAdoptionMilestoneEmail({
                userEmail: order.customer.email,
                userName: adopterName,
                milestoneData: {
                  treeCount: userTreeCount
                }
              });
            }
          }
        } catch (e) {
          console.error('Failed to send tree adoption milestone email:', e);
        }
      }
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
