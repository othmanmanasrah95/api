const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, connectWallet, disconnectWallet, logout, verifyEmail, resendVerification } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const { authLimiter } = require('../middleware/security');


// Register
router.post('/register', authLimiter, validateRegistration, register);

// Login
router.post('/login', authLimiter, validateLogin, login);

// Email verification
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);

// Profile routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/connect-wallet', protect, connectWallet);
router.post('/disconnect-wallet', protect, disconnectWallet);

// Logout (Optional)
router.get('/logout', logout);

module.exports = router;
