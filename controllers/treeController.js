const Tree = require('../models/tree');
const User = require('../models/user');
const TokenBalance = require('../models/tokenBalance');
const Transaction = require('../models/transaction');

// @desc    Get all trees
// @route   GET /api/trees
// @access  Public
exports.getTrees = async (req, res) => {
  try {
    const { status, sort } = req.query;
    let query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Build sort object
    let sortOption = {};
    switch (sort) {
      case 'price-low':
        sortOption = { adoptionPrice: 1 };
        break;
      case 'price-high':
        sortOption = { adoptionPrice: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const trees = await Tree.find(query)
      .sort(sortOption)
      .populate('farmer', 'name')
      .populate('adopters', 'name');

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

// @desc    Get single tree
// @route   GET /api/trees/:id
// @access  Public
exports.getTree = async (req, res) => {
  try {
    const tree = await Tree.findById(req.params.id)
      .populate('farmer', 'name')
      .populate('adopters', 'name');

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

// @desc    Create tree
// @route   POST /api/trees
// @access  Private/Farmer
exports.createTree = async (req, res) => {
  try {
    const tree = await Tree.create({
      ...req.body,
      farmer: req.user._id
    });

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
// @route   PUT /api/trees/:id
// @access  Private/Farmer
exports.updateTree = async (req, res) => {
  try {
    let tree = await Tree.findById(req.params.id);

    if (!tree) {
      return res.status(404).json({
        success: false,
        error: 'Tree not found'
      });
    }

    // Make sure user is tree farmer
    if (tree.farmer.toString() !== req.user._id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this tree'
      });
    }

    tree = await Tree.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

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
// @route   DELETE /api/trees/:id
// @access  Private/Farmer
exports.deleteTree = async (req, res) => {
  try {
    const tree = await Tree.findById(req.params.id);

    if (!tree) {
      return res.status(404).json({
        success: false,
        error: 'Tree not found'
      });
    }

    // Make sure user is tree farmer
    if (tree.farmer.toString() !== req.user._id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this tree'
      });
    }

    await tree.remove();

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

// @desc    Adopt tree
// @route   POST /api/trees/:id/adopt
// @access  Private
exports.adoptTree = async (req, res) => {
  try {
    const tree = await Tree.findById(req.params.id);

    if (!tree) {
      return res.status(404).json({
        success: false,
        error: 'Tree not found'
      });
    }

    // Check if tree is available for adoption
    if (tree.status === 'Fully Adopted') {
      return res.status(400).json({
        success: false,
        error: 'Tree is fully adopted'
      });
    }

    // Check if user already adopted this tree
    if (tree.adopters.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        error: 'You have already adopted this tree'
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      user: req.user._id,
      items: [{
        type: 'tree',
        item: tree._id,
        quantity: 1,
        price: tree.adoptionPrice
      }],
      totalAmount: tree.adoptionPrice,
      paymentMethod: req.body.paymentMethod,
      tokenReward: tree.adoptionPrice * 0.33 // 33% of adoption price as tokens
    });

    // Add user to adopters
    tree.adopters.push(req.user._id);
    await tree.save();

    // Update user's adopted trees
    await User.findByIdAndUpdate(req.user._id, {
      $push: { adoptedTrees: tree._id }
    });

    // Add tokens to user's balance
    const tokenBalance = await TokenBalance.findOne({ user: req.user._id });
    tokenBalance.transactions.push({
      type: 'reward',
      amount: transaction.tokenReward,
      description: `Tree adoption reward for ${tree.name}`,
      reference: transaction._id,
      referenceType: 'Transaction'
    });
    await tokenBalance.save();

    res.status(201).json({
      success: true,
      data: {
        tree,
        transaction
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Add tree update
// @route   POST /api/trees/:id/updates
// @access  Private/Farmer
exports.addTreeUpdate = async (req, res) => {
  try {
    const tree = await Tree.findById(req.params.id);

    if (!tree) {
      return res.status(404).json({
        success: false,
        error: 'Tree not found'
      });
    }

    // Make sure user is tree farmer
    if (tree.farmer.toString() !== req.user._id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to add updates for this tree'
      });
    }

    const update = {
      title: req.body.title,
      content: req.body.content,
      image: req.body.image
    };

    tree.updates.push(update);
    await tree.save();

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