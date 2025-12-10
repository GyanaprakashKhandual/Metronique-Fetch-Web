const express = require('express');
const router = express.Router({ mergeParams: true });
const aiAnalysisController = require('../controllers/ai.analysis.controller');
const { protect, authorizeProjectAccess } = require('../middlewares/auth.middleware');

console.log('[ROUTES] Loading AI Analysis routes');

router.use(protect);

router.post('/:projectId/analysis/start', authorizeProjectAccess('edit'), aiAnalysisController.startAnalysis);

router.get('/:projectId/analysis/status', authorizeProjectAccess('view'), aiAnalysisController.getAnalysisStatus);

router.get('/:projectId/analysis/apis', authorizeProjectAccess('view'), aiAnalysisController.getDiscoveredAPIs);

console.log('[ROUTES] AI Analysis routes loaded successfully');

module.exports = router;