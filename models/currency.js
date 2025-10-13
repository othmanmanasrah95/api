const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    enum: ['USD', 'EUR', 'JOD', 'ILS', 'GBP']
  },
  symbol: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  exchangeRate: {
    type: Number,
    default: 1.0
  },
  decimalPlaces: {
    type: Number,
    default: 2
  },
  position: {
    type: String,
    enum: ['before', 'after'],
    default: 'before'
  }
}, {
  timestamps: true
});

// Static method to get active currency
currencySchema.statics.getActiveCurrency = async function() {
  const currency = await this.findOne({ isActive: true });
  if (!currency) {
    // Default to JOD if no currency is set
    const defaultCurrency = new this({
      code: 'JOD',
      symbol: 'د.أ',
      name: 'Jordanian Dinar',
      isActive: true,
      exchangeRate: 1.0,
      decimalPlaces: 3,
      position: 'after'
    });
    await defaultCurrency.save();
    return defaultCurrency;
  }
  return currency;
};

// Static method to set active currency
currencySchema.statics.setActiveCurrency = async function(currencyCode) {
  // Deactivate all currencies
  await this.updateMany({}, { isActive: false });
  
  // Activate the selected currency
  const currency = await this.findOneAndUpdate(
    { code: currencyCode },
    { isActive: true },
    { new: true }
  );
  
  if (!currency) {
    throw new Error(`Currency with code ${currencyCode} not found`);
  }
  
  return currency;
};

module.exports = mongoose.model('Currency', currencySchema);

