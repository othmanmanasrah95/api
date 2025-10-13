const mongoose = require("mongoose");

const tokenBalanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  transactions: [
    {
      type: {
        type: String,
        enum: ["reward", "redemption", "donation", "transfer", "adoption", "purchase"],
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
      description: String,
      reference: mongoose.Schema.Types.ObjectId,
      referenceType: String,
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

// Update lastUpdated timestamp before saving
tokenBalanceSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model("TokenBalance", tokenBalanceSchema); 