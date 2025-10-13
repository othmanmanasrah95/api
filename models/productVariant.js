const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Variant name is required (e.g., 250ml, 500ml)']
  },
  sku: {
    type: String,
    unique: true,
    sparse: true // Allows null values but enforces uniqueness for non-null
  },
  price: {
    type: Number,
    required: [true, 'Price is required']
  },
  originalPrice: {
    type: Number,
    default: null
  },
  tutPrice: {
    type: Number,
    default: null,
    min: 0
  },
  tutRewardPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  tutRewardFixed: {
    type: Number,
    default: 0,
    min: 0
  },
  stockQuantity: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  attributes: {
    type: Map,
    of: String,
    default: {}
  },
  images: [{
    type: String,
    required: false
  }],
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['g', 'kg', 'ml', 'l'],
      default: 'ml'
    }
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['cm', 'in'],
      default: 'cm'
    }
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
productVariantSchema.index({ product: 1, isActive: 1 });


// Virtual for formatted price
productVariantSchema.virtual('formattedPrice').get(function() {
  return this.price.toFixed(3);
});

// Method to check if variant is in stock
productVariantSchema.methods.isInStock = function() {
  return this.stockQuantity > 0;
};

// Method to reduce stock
productVariantSchema.methods.reduceStock = function(quantity) {
  if (this.stockQuantity >= quantity) {
    this.stockQuantity -= quantity;
    return this.save();
  }
  throw new Error('Insufficient stock');
};

// Method to add stock
productVariantSchema.methods.addStock = function(quantity) {
  this.stockQuantity += quantity;
  return this.save();
};

module.exports = mongoose.model('ProductVariant', productVariantSchema);
