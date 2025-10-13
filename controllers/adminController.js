const User = require('../models/user');
const Product = require('../models/product');
const ProductVariant = require('../models/productVariant');
const Tree = require('../models/tree');
const LandPlot = require('../models/landPlot');
const Transaction = require('../models/transaction');
const Order = require('../models/order');
const TokenBalance = require('../models/tokenBalance');
const Currency = require('../models/currency');

// @desc    Get dashboard overview
// @route   GET /api/admin/overview
// @access  Private/Admin
exports.getOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalTrees = await Tree.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalTransactions = await Transaction.countDocuments();

    const recentOrders = await Order.find()
      .sort('-createdAt')
      .limit(5)
      .populate('user', 'name email');

    const recentTrees = await Tree.find()
      .sort('-createdAt')
      .limit(5)
      .populate('farmer', 'name');

    const recentProducts = await Product.find()
      .sort('-createdAt')
      .limit(5)
      .populate('seller', 'name');

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalProducts,
          totalTrees,
          totalOrders,
          totalTransactions
        },
        recent: {
          orders: recentOrders,
          trees: recentTrees,
          products: recentProducts
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('adoptedTrees')
      .populate('orders');

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new user
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Create new user
    const newUser = new User({ 
      name, 
      email, 
      password, 
      role: role || 'user'
    });
    await newUser.save();

    res.status(201).json({
      success: true,
      data: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    // Validate role if provided
    if (role && !['user', 'admin', 'farmer'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin', 'farmer'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all products
// @route   GET /api/admin/products
// @access  Private/Admin
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate('seller', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new product
// @route   POST /api/admin/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();

    await product.populate('seller', 'name email');

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
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('seller', 'name email');

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

// @desc    Delete product
// @route   DELETE /api/admin/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all trees
// @route   GET /api/admin/trees
// @access  Private/Admin
exports.getTrees = async (req, res) => {
  try {
    const trees = await Tree.find()
      .populate('farmer', 'name email')
      .populate('landPlot', 'name location')
      .sort('-createdAt');

    res.json({
      success: true,
      count: trees.length,
      data: trees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new tree
// @route   POST /api/admin/trees
// @access  Private/Admin
exports.createTree = async (req, res) => {
  try {
    const tree = new Tree(req.body);
    await tree.save();

    await tree.populate('farmer', 'name email');
    await tree.populate('landPlot', 'name location');

    res.status(201).json({
      success: true,
      data: tree
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update tree
// @route   PUT /api/admin/trees/:id
// @access  Private/Admin
exports.updateTree = async (req, res) => {
  try {
    const tree = await Tree.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('farmer', 'name email').populate('landPlot', 'name location');

    if (!tree) {
      return res.status(404).json({
        success: false,
        error: 'Tree not found'
      });
    }

    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete tree
// @route   DELETE /api/admin/trees/:id
// @access  Private/Admin
exports.deleteTree = async (req, res) => {
  try {
    const tree = await Tree.findById(req.params.id);

    if (!tree) {
      return res.status(404).json({
        success: false,
        error: 'Tree not found'
      });
    }

    await Tree.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Tree deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all land plots
// @route   GET /api/admin/land-plots
// @access  Private/Admin
exports.getLandPlots = async (req, res) => {
  try {
    const landPlots = await LandPlot.find()
      .populate('farmer', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      count: landPlots.length,
      data: landPlots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new land plot
// @route   POST /api/admin/land-plots
// @access  Private/Admin
exports.createLandPlot = async (req, res) => {
  try {
    const landPlot = new LandPlot(req.body);
    await landPlot.save();

    await landPlot.populate('farmer', 'name email');

    res.status(201).json({
      success: true,
      data: landPlot
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update land plot
// @route   PUT /api/admin/land-plots/:id
// @access  Private/Admin
exports.updateLandPlot = async (req, res) => {
  try {
    const landPlot = await LandPlot.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('farmer', 'name email');

    if (!landPlot) {
      return res.status(404).json({
        success: false,
        error: 'Land plot not found'
      });
    }

    res.json({
      success: true,
      data: landPlot
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete land plot
// @route   DELETE /api/admin/land-plots/:id
// @access  Private/Admin
exports.deleteLandPlot = async (req, res) => {
  try {
    const landPlot = await LandPlot.findById(req.params.id);

    if (!landPlot) {
      return res.status(404).json({
        success: false,
        error: 'Land plot not found'
      });
    }

    await LandPlot.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Land plot deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.item')
      .sort('-createdAt');

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single order
// @route   GET /api/admin/orders/:id
// @access  Private/Admin
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.item');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update payment status
// @route   PUT /api/admin/orders/:id/payment-status
// @access  Private/Admin
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    if (!['pending', 'processing', 'completed', 'failed', 'refunded'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment status'
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete order
// @route   DELETE /api/admin/orders/:id
// @access  Private/Admin
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    await Order.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get token balances
// @route   GET /api/admin/token-balances
// @access  Private/Admin
exports.getTokenBalances = async (req, res) => {
  try {
    const tokenBalances = await TokenBalance.find()
      .populate('user', 'name email')
      .sort('-balance');

    res.json({
      success: true,
      count: tokenBalances.length,
      data: tokenBalances
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all currencies
// @route   GET /api/admin/currencies
// @access  Private/Admin
exports.getCurrencies = async (req, res) => {
  try {
    const currencies = await Currency.find().sort('code');

    res.json({
      success: true,
      count: currencies.length,
      data: currencies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get active currency
// @route   GET /api/admin/currencies/active
// @access  Private/Admin
exports.getActiveCurrency = async (req, res) => {
  try {
    const currency = await Currency.getActiveCurrency();

    res.json({
      success: true,
      data: currency
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Set active currency
// @route   PUT /api/admin/currencies/active
// @access  Private/Admin
exports.setActiveCurrency = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Currency code is required'
      });
    }

    const currency = await Currency.setActiveCurrency(code);

    res.json({
      success: true,
      data: currency,
      message: `Currency changed to ${currency.name} (${currency.code})`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new currency
// @route   POST /api/admin/currencies
// @access  Private/Admin
exports.createCurrency = async (req, res) => {
  try {
    const currency = new Currency(req.body);
    await currency.save();

    res.status(201).json({
      success: true,
      data: currency
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update currency
// @route   PUT /api/admin/currencies/:id
// @access  Private/Admin
exports.updateCurrency = async (req, res) => {
  try {
    const currency = await Currency.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!currency) {
      return res.status(404).json({
        success: false,
        error: 'Currency not found'
      });
    }

    res.json({
      success: true,
      data: currency
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete currency
// @route   DELETE /api/admin/currencies/:id
// @access  Private/Admin
exports.deleteCurrency = async (req, res) => {
  try {
    const currency = await Currency.findById(req.params.id);

    if (!currency) {
      return res.status(404).json({
        success: false,
        error: 'Currency not found'
      });
    }

    if (currency.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete active currency. Please set another currency as active first.'
      });
    }

    await Currency.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Currency deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get product variants
// @route   GET /api/admin/products/:id/variants
// @access  Private/Admin
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

// @desc    Create product variant
// @route   POST /api/admin/products/:id/variants
// @access  Private/Admin
exports.createProductVariant = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const variantData = {
      ...req.body,
      product: req.params.id
    };

    const variant = new ProductVariant(variantData);
    await variant.save();

    // Update product to indicate it has variants
    if (!product.hasVariants) {
      product.hasVariants = true;
      product.variantType = req.body.variantType || 'size';
      product.variantLabel = req.body.variantLabel || 'Size';
      await product.save();
    }

    res.status(201).json({
      success: true,
      data: variant
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update product variant
// @route   PUT /api/admin/variants/:id
// @access  Private/Admin
exports.updateProductVariant = async (req, res) => {
  try {
    const variant = await ProductVariant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!variant) {
      return res.status(404).json({
        success: false,
        error: 'Product variant not found'
      });
    }

    res.json({
      success: true,
      data: variant
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete product variant
// @route   DELETE /api/admin/variants/:id
// @access  Private/Admin
exports.deleteProductVariant = async (req, res) => {
  try {
    const variant = await ProductVariant.findById(req.params.id);

    if (!variant) {
      return res.status(404).json({
        success: false,
        error: 'Product variant not found'
      });
    }

    await ProductVariant.findByIdAndDelete(req.params.id);

    // Check if product still has variants
    const remainingVariants = await ProductVariant.countDocuments({ product: variant.product });
    if (remainingVariants === 0) {
      await Product.findByIdAndUpdate(variant.product, { hasVariants: false });
    }

    res.json({
      success: true,
      message: 'Product variant deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Bulk create variants for olive oil
// @route   POST /api/admin/products/:id/variants/bulk
// @access  Private/Admin
exports.bulkCreateVariants = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const { variants } = req.body;
    if (!Array.isArray(variants)) {
      return res.status(400).json({
        success: false,
        error: 'Variants must be an array'
      });
    }

    const createdVariants = [];
    for (const variantData of variants) {
      const variant = new ProductVariant({
        ...variantData,
        product: req.params.id
      });
      await variant.save();
      createdVariants.push(variant);
    }

    // Update product to indicate it has variants
    product.hasVariants = true;
    product.variantType = 'size';
    product.variantLabel = 'Size';
    await product.save();

    res.status(201).json({
      success: true,
      count: createdVariants.length,
      data: createdVariants
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};