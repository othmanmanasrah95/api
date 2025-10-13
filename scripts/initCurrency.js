const mongoose = require('mongoose');
const Currency = require('../models/currency');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

const initializeCurrencies = async () => {
  try {
    await connectDB();

    // Check if currencies already exist
    const existingCurrencies = await Currency.find();
    if (existingCurrencies.length > 0) {
      console.log('Currencies already exist. Skipping initialization.');
      process.exit(0);
    }

    // Create default currencies
    const currencies = [
      {
        code: 'JOD',
        symbol: 'د.أ',
        name: 'Jordanian Dinar',
        isActive: true,
        exchangeRate: 1.0,
        decimalPlaces: 3,
        position: 'after'
      },
      {
        code: 'USD',
        symbol: '$',
        name: 'US Dollar',
        isActive: false,
        exchangeRate: 0.71,
        decimalPlaces: 2,
        position: 'before'
      },
      {
        code: 'EUR',
        symbol: '€',
        name: 'Euro',
        isActive: false,
        exchangeRate: 0.65,
        decimalPlaces: 2,
        position: 'before'
      },
      {
        code: 'GBP',
        symbol: '£',
        name: 'British Pound',
        isActive: false,
        exchangeRate: 0.56,
        decimalPlaces: 2,
        position: 'before'
      },
      {
        code: 'ILS',
        symbol: '₪',
        name: 'Israeli Shekel',
        isActive: false,
        exchangeRate: 2.6,
        decimalPlaces: 2,
        position: 'before'
      }
    ];

    for (const currencyData of currencies) {
      const currency = new Currency(currencyData);
      await currency.save();
      console.log(`Created currency: ${currency.name} (${currency.code})`);
    }

    console.log('✅ Currency initialization completed successfully!');
    console.log('🌍 JOD (Jordanian Dinar) is set as the active currency');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing currencies:', error.message);
    process.exit(1);
  }
};

initializeCurrencies();

