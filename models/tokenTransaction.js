const mongoose = require('mongoose');

const tokenTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['reward', 'redemption', 'donation', 'transfer', 'purchase'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String
  },
  reference: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceType'
  },
  referenceType: {
    type: String,
    enum: ['Transaction', 'Tree', 'Order'],
    required: false
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  }
});

module.exports = mongoose.model('TokenTransaction', tokenTransactionSchema);
