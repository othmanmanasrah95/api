const express = require('express');
const router = express.Router();
const {
  getLandPlots,
  getLandPlot,
  createLandPlot,
  updateLandPlot,
  deleteLandPlot,
  adoptTree,
  getMyAdoptions
} = require('../controllers/landPlotController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/', getLandPlots);
router.get('/:id', getLandPlot);

// Protected routes
router.use(protect);
router.post('/', createLandPlot);
router.put('/:id', updateLandPlot);
router.delete('/:id', deleteLandPlot);
router.post('/:id/adopt', adoptTree);
router.get('/my-adoptions', getMyAdoptions);

module.exports = router;
