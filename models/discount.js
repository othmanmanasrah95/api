const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  percentage: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tutAmount: {
    type: Number,
    required: false,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'used', 'expired', 'cancelled'],
    default: 'active'
  },
  usedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  },
  maxUsage: {
    type: Number,
    default: 1
  },
  currentUsage: {
    type: Number,
    default: 0
  },
  minOrderAmount: {
    type: Number,
    default: 0
  },
  maxDiscountAmount: {
    type: Number,
    default: null
  },
  description: {
    type: String,
    default: 'TUT Token Redemption Discount'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
discountSchema.index({ user: 1, status: 1 });
discountSchema.index({ expiresAt: 1 });
discountSchema.index({ status: 1 });

// Virtual for checking if discount is valid
discountSchema.virtual('isValid').get(function() {
  return this.status === 'active' && 
         this.currentUsage < this.maxUsage && 
         this.expiresAt > new Date();
});

// Method to use discount
discountSchema.methods.useDiscount = function(userId, orderId) {
  if (!this.isValid) {
    throw new Error('Discount code is not valid');
  }
  
  this.status = 'used';
  this.usedAt = new Date();
  this.usedBy = userId;
  this.order = orderId;
  this.currentUsage += 1;
  
  return this.save();
};

// Method to calculate discount amount
discountSchema.methods.calculateDiscount = function(orderAmount) {
  if (!this.isValid) {
    return 0;
  }
  
  if (orderAmount < this.minOrderAmount) {
    return 0;
  }
  
  const discountAmount = (orderAmount * this.percentage) / 100;
  
  if (this.maxDiscountAmount && discountAmount > this.maxDiscountAmount) {
    return this.maxDiscountAmount;
  }
  
  return Math.round(discountAmount * 100) / 100; // Round to 2 decimal places
};

// Static method to generate unique discount code
discountSchema.statics.generateDiscountCode = function() {
  const prefix = 'TUT';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

// Static method to calculate discount percentage from TUT amount
discountSchema.statics.calculateDiscountPercentage = function(tutAmount) {
  // 1% for every 100 TUT, maximum 50%
  const percentage = Math.floor(tutAmount / 100);
  return Math.min(percentage, 50);
};

// Pre-save middleware to set expiration date if not provided
discountSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    // Default expiration: 30 days from creation
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Discount', discountSchema);
