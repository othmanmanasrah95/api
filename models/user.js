const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const constants = require('../config/constants');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [constants.PASSWORD_MIN_LENGTH, `Password must be at least ${constants.PASSWORD_MIN_LENGTH} characters`],
    select: false
  },
  profilePicture: {
    type: String,
    trim: true
  },
  walletAddress: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Please provide a valid Ethereum address']
  },
  walletConnected: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'farmer'],
    default: 'user'
  },
  // MetaMask-related (optional)
  wallet: {
    type: String,
    unique: true,
    sparse: true
  },
  isMetaMask: {
    type: Boolean,
    default: false
  },
  tutBalance: {
    type: Number,
    default: 0
  },
  tbm: {
    type: Number,
    default: 0
  },
  tokenBalance: {
    type: Number,
    default: 0
  },
  adoptedTrees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tree'
  }],
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(constants.PASSWORD_SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Indexes for better query performance
userSchema.index({ walletAddress: 1 }); // For wallet address lookups
userSchema.index({ role: 1, createdAt: -1 }); // For role-based queries
userSchema.index({ createdAt: -1 }); // For user registration date queries
userSchema.index({ 'adoptedTrees': 1 }); // For tree adoption queries

module.exports = mongoose.model('User', userSchema);
