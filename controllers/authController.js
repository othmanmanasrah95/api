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

    // Normalize email to lowercase and trim whitespace
    const normalizedEmail = email ? email.toLowerCase().trim() : email;

    // Check if user exists
    const userExists = await User.findOne({ email: normalizedEmail });
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
    const newUser = new User({ 
      name, 
      email: normalizedEmail, 
      password,
      walletAddress: walletAddress || null,
      walletConnected: !!walletAddress 
    });

    // Generate 6-digit verification code and expiry (10 minutes)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    newUser.verificationCode = code;
    newUser.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await newUser.save();

    // Send verification email and wait for result
    try {
      if (!emailService.isConfigured()) {
        console.error('⚠️  Email service not configured - RESEND_API_KEY missing');
        console.error('   Verification code for user:', newUser.email, 'is:', code);
        console.error('   User can use resend-verification endpoint once email service is configured');
      } else {
        const emailResult = await emailService.sendVerificationEmail(newUser.email, newUser.name, code);
        if (emailResult.success) {
          console.log('✅ Verification email sent successfully to:', newUser.email);
        } else {
          console.error('❌ Failed to send verification email:', emailResult.error);
          console.error('   Verification code for user:', newUser.email, 'is:', code);
          console.error('   User can use resend-verification endpoint to request a new code');
        }
      }
    } catch (emailError) {
      console.error('❌ Error sending verification email:', emailError);
      console.error('   Verification code for user:', newUser.email, 'is:', code);
      console.error('   User can use resend-verification endpoint to request a new code');
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email with the 6-digit code sent to you.',
      data: {
        _id: newUser._id,
        email: newUser.email
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

    // Block login if email is not verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        error: 'Email not verified. Please check your email for the code.',
        needsVerification: true
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

// @desc    Verify email with code
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    console.log('📧 Verify email request received:', { email, codeLength: code?.length });
    
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and code are required' });
    }

    // Normalize email to lowercase for consistent lookup
    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔍 Looking up user with email:', normalizedEmail);

    // Find user with verification fields
    const user = await User.findOne({ email: normalizedEmail }).select('+verificationCode +verificationCodeExpires');
    
    if (!user) {
      console.error('❌ User not found for email:', normalizedEmail);
      // Check if user exists without verification fields (for debugging)
      const userExists = await User.findOne({ email: normalizedEmail });
      if (userExists) {
        console.log('⚠️  User exists but verification fields not accessible');
      }
      return res.status(404).json({ success: false, error: 'User not found. Please make sure you used the correct email address.' });
    }

    console.log('✅ User found:', user.email, 'isVerified:', user.isVerified);

    if (user.isVerified) {
      console.log('ℹ️  User already verified');
      return res.status(200).json({ success: true, message: 'Email already verified' });
    }

    if (!user.verificationCode || !user.verificationCodeExpires) {
      console.error('❌ No verification code found for user:', user.email);
      return res.status(400).json({ success: false, error: 'No verification code found. Please request a new code.' });
    }

    console.log('🔐 Comparing codes - stored:', user.verificationCode, 'provided:', code);
    
    if (user.verificationCode !== code) {
      console.error('❌ Invalid verification code for user:', user.email);
      return res.status(400).json({ success: false, error: 'Invalid verification code. Please check and try again.' });
    }

    if (user.verificationCodeExpires < new Date()) {
      console.error('❌ Verification code expired for user:', user.email);
      return res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new code.' });
    }

    // Verify the email
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    console.log('✅ Email verified successfully for user:', user.email);

    // Send welcome email and email verified confirmation (async, don't wait)
    emailService.sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });
    emailService.sendEmailVerifiedEmail({
      userEmail: user.email,
      userName: user.name
    }).catch((err) => {
      console.error('Failed to send email verified email:', err);
    });

    const token = generateToken(user._id);
    return res.status(200).json({ success: true, message: 'Email verified successfully', data: { token } });
  } catch (error) {
    console.error('❌ Error in verifyEmail:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc    Resend verification code
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    console.log('📧 Resend verification request for email:', email);

    const user = await User.findOne({ email });
    if (!user) {
      console.error('❌ User not found for email:', email);
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(200).json({ success: true, message: 'Email already verified' });
    }

    // Generate new verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = code;
    user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log('✅ New verification code generated for user:', user.email);

    // Check if email service is configured
    if (!emailService.isConfigured()) {
      console.error('❌ Email service not configured - RESEND_API_KEY missing');
      return res.status(500).json({ 
        success: false, 
        error: 'Email service is not configured. Please contact support.' 
      });
    }

    // Send verification email
    const result = await emailService.sendVerificationEmail(user.email, user.name || 'User', code);
    if (!result.success) {
      console.error('❌ Failed to send verification email:', result.error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send verification email. Please try again later or contact support.' 
      });
    }

    console.log('✅ Verification email sent successfully to:', user.email);
    return res.status(200).json({ success: true, message: 'Verification code resent successfully' });
  } catch (error) {
    console.error('❌ Error in resendVerification:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
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

    // Send wallet connected milestone email
    try {
      await emailService.sendWalletConnectedEmail({
        userEmail: user.email,
        userName: user.name,
        walletAddress: walletAddress
      });
    } catch (e) {
      console.error('Failed to send wallet connected email:', e);
    }

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