const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 🆕 General transaction type
  type: {
    type: String,
    enum: ['product_purchase', 'adoption', 'planting', 'donation'],
    required: true
  },

  // Dynamic list of purchased/adopted items
  items: [{
    type: {
      type: String,
      enum: ['product', 'tree'],
      required: true
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'items.type',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    }
  }],

  totalAmount: {
    type: Number,
    required: true
  },

  // 🆕 Optional discount field (in TUT)
  tutUsed: {
    type: Number,
    default: 0
  },

  // 🆕 Optional token reward granted after this transaction
  tokenReward: {
    type: Number,
    default: 0
  },

  // 🆕 Related NFT if applicable (for tree adoption)
  relatedNFT: {
    type: String // could be token ID or IPFS hash
  },

  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending'
  },

  paymentMethod: {
    type: String,
    required: true
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },

  shippingAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-calculate total before save
transactionSchema.pre('save', function(next) {
  if (this.isModified('items')) {
    this.totalAmount = this.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
