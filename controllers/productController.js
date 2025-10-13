const Product = require('../models/product');
const ProductVariant = require('../models/productVariant');
const mongoose = require('mongoose');

// @desc    Test database connection
// @route   GET /api/products/test
// @access  Public
exports.testConnection = async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const stateNames = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };
    
    res.json({
      success: true,
      dbState,
      dbStateName: stateNames[dbState],
      message: dbState === 1 ? 'Database connected' : 'Database not connected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        dbState: mongoose.connection.readyState
      });
    }

    const { category, featured, sort } = req.query;
    let query = {};

    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }

    // Filter featured products
    if (featured === 'true') {
      query.featured = true;
    }

    // Build sort object
    let sortOption = {};
    switch (sort) {
      case 'price-low':
        sortOption = { price: 1 };
        break;
      case 'price-high':
        sortOption = { price: -1 };
        break;
      case 'rating':
        sortOption = { rating: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      default:
        sortOption = { featured: -1, createdAt: -1 };
    }

    const products = await Product.find(query)
      .sort(sortOption)
      .populate('seller', 'name');

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Error in getProducts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name')
      .populate('reviews.user', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private/Seller
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create({
      ...req.body,
      seller: req.user._id
    });

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Seller
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Make sure user is product seller
    if (product.seller.toString() !== req.user._id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this product'
      });
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Seller
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Make sure user is product seller
    if (product.seller.toString() !== req.user._id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this product'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Add product review
// @route   POST /api/products/:id/reviews
// @access  Private
exports.addProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Check if user already reviewed
    const alreadyReviewed = product.reviews.find(
      r => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        error: 'Product already reviewed'
      });
    }

    const review = {
      user: req.user._id,
      rating: Number(rating),
      comment
    };

    product.reviews.push(review);
    await product.save();

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get product variants
// @route   GET /api/products/:id/variants
// @access  Public
exports.getProductVariants = async (req, res) => {
  try {
    const variants = await ProductVariant.find({ product: req.params.id })
      .sort('sortOrder');

    res.json({
      success: true,
      count: variants.length,
      data: variants
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};