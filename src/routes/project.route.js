const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { protect } = require('../middlewares/auth.middleware');

console.log('[ROUTES] Loading Project routes');

router.use(protect);

router.post('/create', projectController.createProject);

router.post('/create-with-unified-structure', projectController.createProjectWithUnifiedStructure);

router.get('/', projectController.getUserProjects);

router.get('/:projectId', projectController.getProjectById);

router.get('/:projectId/folder-structure', projectController.getProjectFolderStructure);
router.get('/:projectId/folder/:folderId', projectController.getFolderContents);
router.get('/:projectId/folder-summary', projectController.getFolderStructureSummary);

console.log('[ROUTES] Project routes loaded successfully');

module.exports = router;