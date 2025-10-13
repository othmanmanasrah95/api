const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getOverview,
  getUsers,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  bulkCreateVariants,
  getLandPlots,
  createLandPlot,
  updateLandPlot,
  deleteLandPlot,
  getTokenBalances,
  getCurrencies,
  getActiveCurrency,
  setActiveCurrency,
  createCurrency,
  updateCurrency,
  deleteCurrency
} = require('../controllers/adminController');

// Apply authentication and admin authorization to all admin routes
router.use(protect);
router.use(authorize('admin'));

// Dashboard routes
router.get('/overview', getOverview);

// User management routes
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Product management routes
router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Product variant management routes
router.get('/products/:id/variants', getProductVariants);
router.post('/products/:id/variants', createProductVariant);
router.post('/products/:id/variants/bulk', bulkCreateVariants);
router.put('/variants/:id', updateProductVariant);
router.delete('/variants/:id', deleteProductVariant);

// Land plot management routes
router.get('/land-plots', getLandPlots);
router.post('/land-plots', createLandPlot);
router.put('/land-plots/:id', updateLandPlot);
router.delete('/land-plots/:id', deleteLandPlot);

// Token balance management routes
router.get('/token-balances', getTokenBalances);

// Currency management routes
router.get('/currencies', getCurrencies);
router.get('/currencies/active', getActiveCurrency);
router.put('/currencies/active', setActiveCurrency);
router.post('/currencies', createCurrency);
router.put('/currencies/:id', updateCurrency);
router.delete('/currencies/:id', deleteCurrency);

// TEMPORARY TEST ROUTE (protected)
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: '✅ [adminRoute] route is working!',
    user: req.user.name,
    role: req.user.role
  });
});

module.exports = router;
