const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add vendor name'],
    trim: true
  },
  contactPerson: {
    type: String,
    required: [true, 'Please add a contact person']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  tutRewardPercent: {
    type: Number,
    default: 10,
    min: 0,
    max: 100
  },
  fiatPayoutRate: {
    type: Number,
    default: 1.0 // e.g., 1 ILS per unit
  },
  isActive: {
    type: Boolean,
    default: true
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Vendor', vendorSchema);
