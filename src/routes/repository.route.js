const express = require('express');
const router = express.Router({ mergeParams: true });
const repositoryController = require('../controllers/repository.controller');
const { protect, authorize, authorizeProjectAccess } = require('../middlewares/auth.middleware');

console.log('[ROUTES] Loading Repository routes');

router.use(protect);

router.post(
    '/projects/:projectId/repository/connect',
    authorizeProjectAccess('edit'),
    repositoryController.connectRepository
);

router.get(
    '/projects/:projectId/repository',
    authorizeProjectAccess('view'),
    repositoryController.getRepositoryDetails
);

console.log('[ROUTES] Repository routes loaded successfully');

module.exports = router;