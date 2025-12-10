const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { protect } = require('../middlewares/auth.middleware');

// Log all requests to this router
router.use((req, res, next) => {
    console.log(`[PROJECT_ROUTE] ${req.method} ${req.originalUrl}`);
    next();
});

// Create new project with auto-generated structure
// POST /api/v1/projects
router.post('/', protect, projectController.createProject);

// Get all projects (for current authenticated user)
// GET /api/v1/projects
router.get('/', protect, (req, res) => {
    // Redirect to user projects using authenticated user ID
    return projectController.getUserProjects(req, res);
});

// Get user's projects
// GET /api/v1/projects/user/:userId
router.get('/user/:userId', protect, projectController.getUserProjects);

// Get team's projects
// GET /api/v1/projects/team/:teamId
router.get('/team/:teamId', protect, projectController.getTeamProjects);

// Get complete project with folder hierarchy
// GET /api/v1/projects/:projectId
router.get('/:projectId', protect, projectController.getProjectById);

// Get folder/file tree structure for project
// GET /api/v1/projects/:projectId/hierarchy
router.get('/:projectId/hierarchy', protect, projectController.getProjectHierarchy);

// Get complete project configuration
// GET /api/v1/projects/:projectId/config
router.get('/:projectId/config', protect, projectController.getProjectConfig);

module.exports = router;