// routes/userRoutes.js
const express = require('express');
const router = express.Router();

// Controller functions (to be implemented later)
const {
  getUserProfile,
  updateUserProfile,
  getUserTransactions,
  getUserTokenBalance,
  getUserTrees,
} = require('../controllers/userController');

const { protect } = require('../middleware/auth');


// @route   GET /api/users/profile
// @desc    Get logged-in user's profile
router.get('/profile', protect, getUserProfile);

// @route   PUT /api/users/profile
// @desc    Update logged-in user's profile
router.put('/profile', updateUserProfile);

// @route   GET /api/users/transactions
// @desc    Get user's transaction history
router.get('/transactions', getUserTransactions);

// @route   GET /api/users/token-balance
// @desc    Get user's token balance
router.get('/token-balance', getUserTokenBalance);

// @route   GET /api/users/my-trees
// @desc    Get trees user adopted or planted
router.get('/my-trees', getUserTrees);

module.exports = router;
