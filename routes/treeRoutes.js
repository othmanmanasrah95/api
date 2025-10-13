const express = require('express');
const router = express.Router();
const {
  getTrees,
  getTree,
  createTree,
  updateTree,
  deleteTree
} = require('../controllers/treeController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/', getTrees);
router.get('/:id', getTree);

// Protected routes
router.use(protect);
router.post('/', createTree);
router.put('/:id', updateTree);
router.delete('/:id', deleteTree);

// TEMPORARY TEST ROUTE
router.get('/test', (req, res) => {
  res.json({ success: true, message: '✅ [treeRoute] route is working!' });
});

module.exports = router;
