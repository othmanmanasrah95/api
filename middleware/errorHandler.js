const constants = require('../config/constants');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error("🔥 Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = constants.ERROR_MESSAGES.NOT_FOUND;
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = constants.ERROR_MESSAGES.INVALID_TOKEN;
    error = { message, statusCode: 401 };
  }

  if (err.name === "TokenExpiredError") {
    const message = constants.ERROR_MESSAGES.INVALID_TOKEN;
    error = { message, statusCode: 401 };
  }

  // Rate limiting errors
  if (err.status === 429) {
    const message = constants.ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
    error = { message, statusCode: 429 };
  }

  // Custom error handling
  if (err.statusCode) {
    error.statusCode = err.statusCode;
  }

  // Default error
  if (!error.statusCode) {
    error.statusCode = 500;
    error.message = constants.ERROR_MESSAGES.INTERNAL_ERROR;
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === "production" && error.statusCode === 500) {
    error.message = constants.ERROR_MESSAGES.INTERNAL_ERROR;
  }

  res.status(error.statusCode).json({
    success: false,
    error: error.message,
    ...(process.env.NODE_ENV === "development" && { 
      stack: err.stack,
      details: err.details || null 
    }),
  });
};

// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 handler
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = { errorHandler, asyncHandler, notFound }; 