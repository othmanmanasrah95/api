const { body, validationResult } = require("express-validator");
const constants = require('../config/constants');

const validateRegistration = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email required"),
  body("password")
    .isLength({ min: constants.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${constants.PASSWORD_MIN_LENGTH} characters`),
  body("walletAddress")
    .optional()
    .isLength({ min: 42, max: 42 })
    .withMessage("Wallet address must be 42 characters"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];

const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email required"),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];

const validateProduct = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Product name must be between 2 and 100 characters"),
  body("description")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("category")
    .isIn(constants.PRODUCT_CATEGORIES)
    .withMessage("Invalid category"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];

const validateTree = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Tree name must be between 2 and 100 characters"),
  body("description")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),
  body("adoptionPrice")
    .isFloat({ min: 0 })
    .withMessage("Adoption price must be a positive number"),
  body("location")
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Location must be between 5 and 200 characters"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];

const validateOrder = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("Order must contain at least one item"),
  body("items.*.id")
    .notEmpty()
    .withMessage("Item ID is required"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
  body("customer.firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  body("customer.lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),
  body("customer.email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email required"),
  body("customer.phone")
    .optional()
    .isLength({ min: 8, max: 20 })
    .withMessage("Phone number must be between 8 and 20 characters"),
  body("shipping.address")
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Address must be between 3 and 200 characters"),
  body("shipping.city")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("City must be between 2 and 100 characters"),
  body("shipping.postalCode")
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Postal code must be between 3 and 20 characters"),
  body("shipping.country")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Country must be between 2 and 100 characters"),
  body("payment.method")
    .isIn(["card", "tut", "credit_card", "paypal", "bank_transfer"])
    .withMessage("Invalid payment method"),
  body("payment.currency")
    .optional()
    .isIn(["USD", "EUR", "JOD", "TUT"])
    .withMessage("Invalid currency"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];

const validateOrderUpdate = [
  body("status")
    .optional()
    .isIn(Object.values(constants.ORDER_STATUS))
    .withMessage("Invalid order status"),
  body("trackingNumber")
    .optional()
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage("Tracking number must be between 5 and 50 characters"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];

const validateEmail = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateProduct,
  validateTree,
  validateOrder,
  validateOrderUpdate,
  validateEmail,
}; 