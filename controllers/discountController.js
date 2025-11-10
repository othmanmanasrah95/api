const Discount = require('../models/discount');
const User = require('../models/user');
const { validationResult } = require('express-validator');
const emailService = require('../services/emailService');

// Generate discount code for TUT redemption (DEPRECATED - Admin only now)
// This endpoint is kept for backward compatibility but should not be used
// Discount codes should only be created by admins
const generateDiscountForRedemption = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Discount code generation is now admin-only. Please contact an administrator.'
  });
};

// Get user's discount codes (only codes assigned to this user)
const getUserDiscounts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { user: userId }; // Only get discounts assigned to this user
    if (status) {
      query.status = status;
    }
    
    const discounts = await Discount.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Discount.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        discounts,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching user discounts:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Validate discount code
const validateDiscountCode = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    
    if (!code || !orderAmount) {
      return res.status(400).json({
        success: false,
        message: 'Discount code and order amount are required'
      });
    }
    
    const discount = await Discount.findOne({ 
      code: code.toUpperCase(),
      status: 'active'
    }).populate('user', 'name email');
    
    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired discount code'
      });
    }
    
    // Check if discount is still valid
    if (!discount.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Discount code is no longer valid'
      });
    }
    
    // Check if user can use this discount (since we're using protect middleware, req.user will always be set)
    // If discount has a user assigned, only that user can use it
    // If discount.user is null, it's a general discount code that anyone can use
    const userId = req.user._id;
    if (discount.user && discount.user._id && discount.user._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This discount code is not available for your account'
      });
    }
    
    // Check minimum order amount
    if (orderAmount < discount.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of $${discount.minOrderAmount} required`
      });
    }
    
    const discountAmount = discount.calculateDiscount(orderAmount);
    
    res.json({
      success: true,
      data: {
        code: discount.code,
        percentage: discount.percentage,
        discountAmount,
        finalAmount: orderAmount - discountAmount,
        description: discount.description,
        expiresAt: discount.expiresAt
      }
    });
    
  } catch (error) {
    console.error('Error validating discount code:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Apply discount code (for checkout)
const applyDiscountCode = async (req, res) => {
  try {
    const { code, orderAmount, orderId } = req.body;
    const userId = req.user._id;
    
    const discount = await Discount.findOne({ 
      code: code.toUpperCase(),
      status: 'active'
    });
    
    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Invalid discount code'
      });
    }
    
    if (!discount.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Discount code is no longer valid'
      });
    }
    
    // Check if user can use this discount (if it's user-specific)
    // If discount has a user assigned, only that user can use it
    // If discount.user is null, it's a general discount code that anyone can use
    if (discount.user && discount.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This discount code is not available for your account'
      });
    }
    
    const discountAmount = discount.calculateDiscount(orderAmount);
    
    if (discountAmount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Discount cannot be applied to this order'
      });
    }
    
    // Mark discount as used
    await discount.useDiscount(userId, orderId);
    
    res.json({
      success: true,
      message: 'Discount code applied successfully',
      data: {
        code: discount.code,
        percentage: discount.percentage,
        discountAmount,
        finalAmount: orderAmount - discountAmount
      }
    });
    
  } catch (error) {
    console.error('Error applying discount code:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin: Get all discount codes
const getAllDiscounts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const discounts = await Discount.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'name email')
      .populate('createdBy', 'name email')
      .populate('usedBy', 'name email')
      .populate('order', 'totalAmount status paymentStatus');
    
    const total = await Discount.countDocuments(query);
    
    // Get statistics
    const stats = await Discount.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDiscount: { $sum: '$percentage' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        discounts,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        },
        stats
      }
    });
    
  } catch (error) {
    console.error('Error fetching all discounts:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin: Create manual discount code
const createDiscountCode = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const {
      code,
      percentage,
      userEmail, // Optional - if not provided, code is general purpose
      maxUsage = 1,
      expiresAt,
      minOrderAmount = 0,
      maxDiscountAmount,
      description,
      sendEmail = false // Optional - send email to user if userEmail is provided
    } = req.body;
    
    let user = null;
    // If userEmail is provided, find and assign user
    if (userEmail) {
      user = await User.findOne({ email: userEmail.toLowerCase() });
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'User not found with the provided email'
        });
      }
    }

    // Generate code if not provided
    let discountCode = code;
    if (!discountCode) {
      // Generate unique discount code
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 10) {
        discountCode = Discount.generateDiscountCode();
        const existingDiscount = await Discount.findOne({ code: discountCode });
        if (!existingDiscount) {
          isUnique = true;
        }
        attempts++;
      }
      
      if (!isUnique) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate unique discount code'
        });
      }
    } else {
      // Check if code already exists
      const existingDiscount = await Discount.findOne({ code: discountCode.toUpperCase() });
      if (existingDiscount) {
        return res.status(400).json({
          success: false,
          message: 'Discount code already exists'
        });
      }
    }
    
    const discount = new Discount({
      code: discountCode.toUpperCase(),
      percentage,
      user: user ? user._id : null, // Can be null for general discount codes
      createdBy: req.user._id,
      maxUsage,
      expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      minOrderAmount,
      maxDiscountAmount,
      description: description || (user ? 'Admin Created Discount Code' : 'General Discount Code'),
      tutAmount: 0 // Default value for manual discount codes
    });
    
    await discount.save();
    
    // Send email to user if requested and user is assigned
    let emailSent = false;
    if (sendEmail && user) {
      try {
        const emailResult = await emailService.sendDiscountCodeEmail(
          user.email,
          user.name,
          {
            code: discount.code,
            percentage: discount.percentage,
            expiresAt: discount.expiresAt,
            description: discount.description,
            minOrderAmount: discount.minOrderAmount,
            maxDiscountAmount: discount.maxDiscountAmount
          }
        );
        emailSent = emailResult.success;
      } catch (emailError) {
        console.error('Error sending discount code email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Discount code created successfully' + (emailSent ? ' and email sent to user' : ''),
      data: {
        ...discount.toObject(),
        emailSent
      }
    });
    
  } catch (error) {
    console.error('Error creating discount code:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin: Update discount code
const updateDiscountCode = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated
    delete updates.code;
    delete updates.user;
    delete updates.createdBy;
    delete updates.currentUsage;
    delete updates.usedAt;
    delete updates.usedBy;
    delete updates.order;
    
    const discount = await Discount.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Discount code not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Discount code updated successfully',
      data: discount
    });
    
  } catch (error) {
    console.error('Error updating discount code:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin: Delete discount code
const deleteDiscountCode = async (req, res) => {
  try {
    const { id } = req.params;
    
    const discount = await Discount.findByIdAndDelete(id);
    
    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Discount code not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Discount code deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting discount code:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  generateDiscountForRedemption,
  getUserDiscounts,
  validateDiscountCode,
  applyDiscountCode,
  getAllDiscounts,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode
};
