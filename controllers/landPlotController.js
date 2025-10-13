const LandPlot = require('../models/landPlot');
const User = require('../models/user');

// @desc    Get all land plots
// @route   GET /api/land-plots
// @access  Public
exports.getLandPlots = async (req, res) => {
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
      case 'most-available':
        sortOption = { availableTrees: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const landPlots = await LandPlot.find(query)
      .sort(sortOption)
      .populate('farmer', 'name email')
      .populate('adoptions.user', 'name');

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

// @desc    Get single land plot
// @route   GET /api/land-plots/:id
// @access  Public
exports.getLandPlot = async (req, res) => {
  try {
    const landPlot = await LandPlot.findById(req.params.id)
      .populate('farmer', 'name email')
      .populate('adoptions.user', 'name');

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

// @desc    Create land plot
// @route   POST /api/land-plots
// @access  Private/Admin
exports.createLandPlot = async (req, res) => {
  try {
    const landPlotData = {
      ...req.body,
      farmer: req.user._id // Set the current admin as the farmer
    };

    const landPlot = await LandPlot.create(landPlotData);

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
// @route   PUT /api/land-plots/:id
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
// @route   DELETE /api/land-plots/:id
// @access  Private/Admin
exports.deleteLandPlot = async (req, res) => {
  try {
    const landPlot = await LandPlot.findByIdAndDelete(req.params.id);

    if (!landPlot) {
      return res.status(404).json({
        success: false,
        error: 'Land plot not found'
      });
    }

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

// @desc    Adopt a tree in land plot
// @route   POST /api/land-plots/:id/adopt
// @access  Private
exports.adoptTree = async (req, res) => {
  try {
    const landPlot = await LandPlot.findById(req.params.id);

    if (!landPlot) {
      return res.status(404).json({
        success: false,
        error: 'Land plot not found'
      });
    }

    // Check if plot has available trees
    if (landPlot.adoptedTrees >= landPlot.totalTrees) {
      return res.status(400).json({
        success: false,
        error: 'No trees available for adoption in this plot'
      });
    }

    // Find next available tree number
    const adoptedTreeNumbers = landPlot.adoptions
      .filter(adoption => adoption.status === 'Active')
      .map(adoption => adoption.treeNumber);
    
    let treeNumber = 1;
    while (adoptedTreeNumbers.includes(treeNumber)) {
      treeNumber++;
    }

    // Calculate expiration date (1 year from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Add adoption
    const adoption = {
      user: req.user._id,
      treeNumber: treeNumber,
      expiresAt: expiresAt,
      status: 'Active'
    };

    landPlot.adoptions.push(adoption);
    landPlot.adoptedTrees = landPlot.adoptions.filter(a => a.status === 'Active').length;
    
    // Update status if fully adopted
    if (landPlot.adoptedTrees >= landPlot.totalTrees) {
      landPlot.status = 'Fully Adopted';
    }

    await landPlot.save();

    // Populate the adoption data
    await landPlot.populate('adoptions.user', 'name');

    res.json({
      success: true,
      data: {
        landPlot,
        adoption: adoption,
        treeNumber: treeNumber
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get user's adopted trees
// @route   GET /api/land-plots/my-adoptions
// @access  Private
exports.getMyAdoptions = async (req, res) => {
  try {
    const landPlots = await LandPlot.find({
      'adoptions.user': req.user._id,
      'adoptions.status': 'Active'
    })
    .populate('farmer', 'name email')
    .select('name location images adoptions adoptionPrice');

    // Filter adoptions for current user
    const userAdoptions = landPlots.map(plot => ({
      ...plot.toObject(),
      adoptions: plot.adoptions.filter(adoption => 
        adoption.user.toString() === req.user._id && adoption.status === 'Active'
      )
    }));

    res.json({
      success: true,
      data: userAdoptions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
