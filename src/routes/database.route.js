const express = require('express');
const router = express.Router({ mergeParams: true });
const databaseController = require('../controllers/database.connection.controller');
const { protect, authorizeProjectAccess } = require('../middlewares/auth.middleware');

console.log('[ROUTES] Loading Database routes');

router.use(protect);

router.post('/:projectId/databases/connect', authorizeProjectAccess('edit'), databaseController.connectDatabase);

router.get('/:projectId/databases', authorizeProjectAccess('view'), databaseController.getDatabaseConnections);

console.log('[ROUTES] Database routes loaded successfully');

module.exports = router;