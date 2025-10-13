const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductReview,
  testConnection
} = require('../controllers/productController');
const { getProductVariants } = require('../controllers/productController');
const { getActiveCurrency } = require('../controllers/adminController');

// Public routes
router.get('/test', testConnection);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.get('/:id/variants', getProductVariants);
router.get('/currency/active', getActiveCurrency);

// Protected routes
router.use(protect);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.post('/:id/reviews', addProductReview);

module.exports = router;
