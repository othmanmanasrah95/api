const User = require('../models/user');
const TokenBalance = require('../models/tokenBalance');
const Tree = require('../models/tree');
const Transaction = require('../models/transaction');
const { generateToken } = require('../utils/tokenUtils');
const emailService = require('../services/emailService');
const mongoose = require('mongoose');

// REGISTER CONTROLLER
exports.register = async (req, res) => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ Database not connected for registration attempt');
      return res.status(503).json({
        success: false,
        error: 'Database not available. Please try again later.',
        dbState: mongoose.connection.readyState
      });
    }

    const { name, email, password, walletAddress } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Check if wallet address is already in use (if provided)
    if (walletAddress) {
      const walletExists = await User.findOne({ walletAddress });
      if (walletExists) {
        return res.status(400).json({
          success: false,
          error: 'Wallet address is already connected to another account'
        });
      }
    }

    // Create new user and let pre-save hash password
    const newUser = new User({ name, email, password,
      walletAddress: walletAddress || null,
      walletConnected: !!walletAddress });
    await newUser.save();

    // Generate token
    const token = generateToken(newUser._id);

    // Send welcome email (async, don't wait for it)
    emailService.sendWelcomeEmail(newUser.email, newUser.name)
      .then(result => {
        if (result.success) {
          console.log('Welcome email sent successfully to:', newUser.email);
        } else {
          console.error('Failed to send welcome email:', result.error);
        }
      })
      .catch(error => {
        console.error('Error sending welcome email:', error);
      });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        walletAddress: newUser.walletAddress,
        walletConnected: newUser.walletConnected,
        token
      }
    });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        walletConnected: user.walletConnected,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('adoptedTrees')
      .populate('orders');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const tokenBalance = await TokenBalance.findOne({ user: user._id });

    res.json({
      success: true,
      data: {
        user,
        tokenBalance
      }
    });
  } catch (error) {
    console.error('getProfile error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    if (typeof req.body.profilePicture !== 'undefined') {
      user.profilePicture = req.body.profilePicture;
    }

    if (req.body.password) {
      if (!req.body.currentPassword) {
        return res.status(400).json({ success: false, error: 'Current password is required' });
      }
      const isMatch = await user.matchPassword(req.body.currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, error: 'Current password is incorrect' });
      }
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        walletAddress: updatedUser.walletAddress,
        walletConnected: updatedUser.walletConnected,
        profilePicture: updatedUser.profilePicture,
        token: generateToken(updatedUser._id)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Connect wallet to user profile
// @route   POST /api/auth/connect-wallet
// @access  Private
exports.connectWallet = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }
    // Check if wallet address is already in use
    const walletExists = await User.findOne({ walletAddress });
    if (walletExists && walletExists._id.toString() !== req.user._id.toString()) {
      return res.status(400).json({ success: false, error: 'Wallet address is already connected to another account' });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    user.walletAddress = walletAddress;
    user.walletConnected = true;
    await user.save();
    res.json({ success: true, message: 'Wallet connected successfully', walletAddress });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @route   POST /api/auth/disconnect-wallet
// @access  Private
exports.disconnectWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Clear wallet information
    user.walletAddress = undefined;
    user.walletConnected = false;
    await user.save();
    
    res.json({ success: true, message: 'Wallet disconnected successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Logout user (JWT-based, stateless)
// @route   GET /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
  // For JWT, logout is handled on the client by deleting the token
  res.json({ success: true, message: 'Logged out successfully' });
}; 