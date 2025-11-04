const orderService = require('../services/OrderService');
const constants = require('../config/constants');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = asyncHandler(async (req, res) => {
  console.log('Order creation request body:', JSON.stringify(req.body, null, 2));
  console.log('User making request:', req.user);
  
  const order = await orderService.createOrder(req.body, req.user._id);

  res.status(201).json({
    success: true,
    message: constants.SUCCESS_MESSAGES.ORDER_CREATED,
    data: order
  });
});

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
exports.getUserOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    populate: ['user']
  };

  if (status) {
    options.filter = { status };
  }

  const result = await orderService.getUserOrders(req.user._id, options);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination
  });
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.findById(req.params.id, ['user']);
  
  // Check if user owns the order or is admin
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: constants.ERROR_MESSAGES.FORBIDDEN
    });
  }

  res.status(200).json({
    success: true,
    data: order
  });
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, trackingNumber } = req.body;
  
  const order = await orderService.updateOrderStatus(req.params.id, status, trackingNumber);

  res.status(200).json({
    success: true,
    message: constants.SUCCESS_MESSAGES.ORDER_UPDATED,
    data: order
  });
});

// @desc    Update payment status
// @route   PUT /api/orders/:id/payment-status
// @access  Private/Admin
exports.updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;
  
  if (!paymentStatus) {
    return res.status(400).json({
      success: false,
      error: 'Payment status is required'
    });
  }

  const validStatuses = ['pending', 'completed', 'failed', 'refunded', 'processing'];
  if (!validStatuses.includes(paymentStatus)) {
    return res.status(400).json({
      success: false,
      error: `Invalid payment status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  const order = await orderService.findById(req.params.id);
  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found'
    });
  }

  order.payment.status = paymentStatus;
  await order.save();

  res.status(200).json({
    success: true,
    message: 'Payment status updated successfully',
    data: order
  });
});

// @desc    Get all orders (Admin)
// @route   GET /api/orders/admin/all
// @access  Private/Admin
exports.getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, startDate, endDate } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    populate: ['user']
  };

  if (status) {
    options.filter = { status };
  }

  let result;
  if (startDate && endDate) {
    result = await orderService.getOrdersByDateRange(startDate, endDate, options);
  } else {
    result = await orderService.findAll(options);
  }

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination
  });
});

// @desc    Get order statistics (Admin)
// @route   GET /api/orders/admin/statistics
// @access  Private/Admin
exports.getOrderStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  let filter = {};
  if (startDate && endDate) {
    filter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const statistics = await orderService.getOrderStatistics(filter);

  res.status(200).json({
    success: true,
    data: statistics
  });
});

// @desc    Process TUT payment
// @route   POST /api/orders/:id/process-tut-payment
// @access  Private
exports.processTUTPayment = asyncHandler(async (req, res) => {
  const { transactionHash } = req.body;
  
  if (!transactionHash) {
    return res.status(400).json({
      success: false,
      error: 'Transaction hash is required'
    });
  }

  // Get the order
  const order = await orderService.findById(req.params.id);
  
  if (!order.isTutTransaction) {
    return res.status(400).json({
      success: false,
      error: 'This order is not a TUT transaction'
    });
  }

  // Verify the transaction (this would integrate with your TUT payment service)
  // For now, we'll just update the order status
  const updatedOrder = await orderService.updateOrderStatus(req.params.id, constants.ORDER_STATUS.CONFIRMED);

  res.status(200).json({
    success: true,
    message: constants.SUCCESS_MESSAGES.PAYMENT_SUCCESSFUL,
    data: updatedOrder
  });
});

// @desc    Debug TUT balance
// @route   GET /api/orders/debug-tut-balance
// @access  Private
exports.debugTutBalance = asyncHandler(async (req, res) => {
  // This is a debug endpoint - implement as needed
  res.status(200).json({
    success: true,
    message: 'Debug endpoint - implement TUT balance checking logic'
  });
});
