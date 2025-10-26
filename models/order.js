const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    productId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    tutPrice: {
      type: Number,
      default: null
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    type: {
      type: String,
      enum: ['product', 'tree'],
      required: true
    },
    purchaseMethod: {
      type: String,
      enum: ['money', 'tut', 'card'],
      default: 'money'
    },
    tutRewardPercent: {
      type: Number,
      default: 0
    },
    tutRewardFixed: {
      type: Number,
      default: 0
    }
  }],
  customer: {
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    }
  },
  shipping: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    }
  },
  payment: {
    method: {
      type: String,
      enum: ['card', 'tut', 'stripe', 'credit_card', 'paypal', 'bank_transfer'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: {
      type: String,
      default: null
    }
  },
  totals: {
    subtotal: {
      type: Number,
      required: true
    },
    shipping: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    },
    tutTotal: {
      type: Number,
      default: 0
    }
  },
  specialInstructions: {
    type: String,
    default: ''
  },
  isTutTransaction: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  trackingNumber: {
    type: String,
    default: null
  },
  notes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  orderNumber: {
    type: String,
    unique: true,
    default: function() {
      return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
orderSchema.index({ user: 1, createdAt: -1 }); // For user orders with recent first
orderSchema.index({ status: 1, createdAt: -1 }); // For orders by status with date ordering
orderSchema.index({ 'payment.method': 1, createdAt: -1 }); // For payment method queries
orderSchema.index({ isTutTransaction: 1, createdAt: -1 }); // For TUT transactions
orderSchema.index({ 'payment.currency': 1, createdAt: -1 }); // For orders by currency
orderSchema.index({ 'customer.email': 1 }); // For customer lookup
orderSchema.index({ createdAt: -1 }); // For general date ordering
orderSchema.index({ total: 1 }); // For revenue queries

module.exports = mongoose.model('Order', orderSchema);