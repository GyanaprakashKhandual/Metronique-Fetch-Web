const express = require('express');
const router = express.Router({ mergeParams: true });
const testExecutionController = require('../controllers/test.execution.controller');
const { protect, authorizeProjectAccess } = require('../middlewares/auth.middleware');

console.log('[ROUTES] Loading Test Execution routes');

router.use(protect);

router.post('/:projectId/tests/run', authorizeProjectAccess('edit'), testExecutionController.runTests);

router.get('/executions/:executionId/status', testExecutionController.getExecutionStatus);

router.get('/executions/:executionId/results', testExecutionController.getExecutionResults);

router.get('/:projectId/executions/history', authorizeProjectAccess('view'), testExecutionController.getExecutionHistory);

console.log('[ROUTES] Test Execution routes loaded successfully');

module.exports = router;