const express = require('express');
const router = express.Router({ mergeParams: true });
const testScriptController = require('../controllers/test.script.controller');
const { protect, authorizeProjectAccess } = require('../middlewares/auth.middleware');

console.log('[ROUTES] Loading Test Script routes');

router.use(protect);

router.post('/:projectId/scripts/create', authorizeProjectAccess('edit'), testScriptController.createTestScript);

router.get('/:projectId/scripts', authorizeProjectAccess('view'), testScriptController.getTestScripts);

router.get('/scripts/:scriptId', testScriptController.getTestScriptById);

console.log('[ROUTES] Test Script routes loaded successfully');

module.exports = router;