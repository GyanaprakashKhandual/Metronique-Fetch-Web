const express = require('express');
const router = express.Router({ mergeParams: true });
const testFolderController = require('../controllers/test.folder.controller');
const { protect, authorizeProjectAccess } = require('../middlewares/auth.middleware');

console.log('[ROUTES] Loading Test Folder routes');

router.use(protect);

router.post('/:projectId/folders/generate', authorizeProjectAccess('edit'), testFolderController.generateTestFolderStructure);

router.get('/:projectId/folders/structure', authorizeProjectAccess('view'), testFolderController.getTestFolderStructure);

router.post('/:projectId/folders/create', authorizeProjectAccess('edit'), testFolderController.createFolder);

console.log('[ROUTES] Test Folder routes loaded successfully');

module.exports = router;