const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { protect } = require('../middlewares/auth.middleware'); // ADD THIS LINE

/**
 * Apply authentication middleware to ALL project routes
 */
router.use(protect); // THIS LINE IS CRITICAL!

/**
 * @route   POST /api/projects
 * @desc    Create a new project with auto-generated test environment
 * @access  Private
 * @body    { name: string, description?: string, visibility?: 'private'|'team'|'public' }
 */
router.post('/', projectController.createProject);

/**
 * @route   GET /api/projects/:projectId/structure
 * @desc    Get complete project hierarchy (folder and file structure)
 * @access  Private
 */
router.get('/:projectId/structure', projectController.getProjectStructure);

/**
 * @route   POST /api/projects/:projectId/structure/add
 * @desc    Add file or folder to project structure
 * @access  Private
 * @body    { parentPath: string, name: string, type: 'file'|'folder', content?: string }
 */
router.post('/:projectId/structure/add', projectController.addToStructure);

module.exports = router;