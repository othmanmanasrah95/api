// Application constants and configuration
// This file centralizes all hardcoded values for better maintainability

module.exports = {
  // Business Logic Constants
  TAX_RATE: parseFloat(process.env.TAX_RATE) || 0.08, // 8% tax rate
  FREE_SHIPPING_THRESHOLD: parseFloat(process.env.FREE_SHIPPING_THRESHOLD) || 25.00,
  SHIPPING_COST: parseFloat(process.env.SHIPPING_COST) || 5.00,
  
  // Security Constants
  PASSWORD_MIN_LENGTH: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
  PASSWORD_SALT_ROUNDS: parseInt(process.env.PASSWORD_SALT_ROUNDS) || 12,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  SENSITIVE_RATE_LIMIT_MAX: parseInt(process.env.SENSITIVE_RATE_LIMIT_MAX) || 10,
  
  // Database
  PAGINATION_DEFAULT_LIMIT: parseInt(process.env.PAGINATION_DEFAULT_LIMIT) || 10,
  PAGINATION_MAX_LIMIT: parseInt(process.env.PAGINATION_MAX_LIMIT) || 100,
  
  // File Upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(','),
  
  // Order Status
  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  },
  
  // User Roles
  USER_ROLES: {
    USER: 'user',
    ADMIN: 'admin',
    VENDOR: 'vendor'
  },
  
  // Product Categories
  PRODUCT_CATEGORIES: [
    'olive_oil',
    'soap',
    'cosmetics',
    'food',
    'other'
  ],
  
  // Error Messages
  ERROR_MESSAGES: {
    UNAUTHORIZED: 'Access denied. Authentication required.',
    FORBIDDEN: 'Access denied. Insufficient permissions.',
    NOT_FOUND: 'Resource not found.',
    VALIDATION_ERROR: 'Validation failed.',
    INTERNAL_ERROR: 'Internal server error.',
    INVALID_CREDENTIALS: 'Invalid email or password.',
    USER_EXISTS: 'User already exists.',
    WALLET_EXISTS: 'Wallet address is already connected to another account.',
    INVALID_TOKEN: 'Invalid or expired token.',
    RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
    INVALID_INPUT: 'Invalid input provided.',
    MISSING_REQUIRED_FIELDS: 'Required fields are missing.',
    ORDER_NOT_FOUND: 'Order not found.',
    PRODUCT_NOT_FOUND: 'Product not found.',
    INSUFFICIENT_BALANCE: 'Insufficient balance for this transaction.',
    INVALID_PAYMENT_METHOD: 'Invalid payment method.',
    ORDER_ALREADY_PROCESSED: 'Order has already been processed.'
  },
  
  // Success Messages
  SUCCESS_MESSAGES: {
    USER_REGISTERED: 'User registered successfully',
    USER_LOGGED_IN: 'User logged in successfully',
    USER_UPDATED: 'User updated successfully',
    ORDER_CREATED: 'Order created successfully',
    ORDER_UPDATED: 'Order updated successfully',
    ORDER_CANCELLED: 'Order cancelled successfully',
    PRODUCT_CREATED: 'Product created successfully',
    PRODUCT_UPDATED: 'Product updated successfully',
    PRODUCT_DELETED: 'Product deleted successfully',
    TREE_CREATED: 'Tree created successfully',
    TREE_UPDATED: 'Tree updated successfully',
    TREE_DELETED: 'Tree deleted successfully',
    PAYMENT_SUCCESSFUL: 'Payment processed successfully',
    TOKEN_TRANSFER_SUCCESSFUL: 'Token transfer completed successfully'
  }
};
