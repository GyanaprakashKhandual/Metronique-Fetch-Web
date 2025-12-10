const express = require('express');
const router = express.Router({ mergeParams: true });
const testFileController = require('../controllers/test.file.controller');
const { protect, authorizeProjectAccess } = require('../middlewares/auth.middleware');

console.log('[ROUTES] Loading Test File routes');

router.use(protect);

router.post('/:projectId/files/create', authorizeProjectAccess('edit'), testFileController.createTestFile);

router.get('/files/:fileId', testFileController.getTestFile);

router.get('/folders/:folderId/files', testFileController.getFilesByFolder);

console.log('[ROUTES] Test File routes loaded successfully');

module.exports = router;