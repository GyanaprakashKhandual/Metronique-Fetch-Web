const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation Errors:', JSON.stringify(errors.array(), null, 2));
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    console.log('Validation passed successfully');
    next();
};

const createRepository = [
    body('project')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    body('provider')
        .optional()
        .isIn(['github', 'gitlab', 'bitbucket', 'azure-devops'])
        .withMessage('Provider must be github, gitlab, bitbucket, or azure-devops'),

    body('name')
        .notEmpty().withMessage('Repository name is required')
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage('Repository name must be between 1 and 100 characters'),

    body('fullName')
        .notEmpty().withMessage('Repository full name is required')
        .trim(),

    body('url')
        .notEmpty().withMessage('Repository URL is required')
        .trim()
        .isURL().withMessage('Invalid repository URL'),

    body('cloneUrl')
        .optional()
        .trim()
        .isURL().withMessage('Invalid clone URL'),

    body('sshUrl')
        .optional()
        .trim(),

    body('repositoryOwner')
        .optional()
        .trim(),

    body('repositoryId')
        .optional()
        .trim(),

    body('defaultBranch')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage('Default branch must be between 1 and 50 characters'),

    body('selectedBranch')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage('Selected branch must be between 1 and 50 characters'),

    body('isPrivate')
        .optional()
        .isBoolean().withMessage('Is private must be a boolean'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),

    body('language')
        .optional()
        .trim(),

    body('size')
        .optional()
        .isInt({ min: 0 }).withMessage('Size must be a non-negative integer'),

    body('starCount')
        .optional()
        .isInt({ min: 0 }).withMessage('Star count must be a non-negative integer'),

    body('forkCount')
        .optional()
        .isInt({ min: 0 }).withMessage('Fork count must be a non-negative integer'),

    body('openIssuesCount')
        .optional()
        .isInt({ min: 0 }).withMessage('Open issues count must be a non-negative integer'),

    body('authentication.type')
        .optional()
        .isIn(['oauth', 'token', 'ssh'])
        .withMessage('Authentication type must be oauth, token, or ssh'),

    body('authentication.accessToken')
        .optional()
        .trim(),

    body('authentication.refreshToken')
        .optional()
        .trim(),

    body('authentication.tokenExpiry')
        .optional()
        .isISO8601().withMessage('Token expiry must be a valid ISO 8601 date'),

    body('authentication.username')
        .optional()
        .trim(),

    body('connection.syncFrequency')
        .optional()
        .isIn(['manual', 'hourly', 'daily', 'weekly', 'on-commit'])
        .withMessage('Sync frequency must be manual, hourly, daily, weekly, or on-commit'),

    body('connection.autoSync')
        .optional()
        .isBoolean().withMessage('Auto sync must be a boolean'),

    body('permissions.canRead')
        .optional()
        .isBoolean().withMessage('Can read must be a boolean'),

    body('permissions.canWrite')
        .optional()
        .isBoolean().withMessage('Can write must be a boolean'),

    body('permissions.canAdmin')
        .optional()
        .isBoolean().withMessage('Can admin must be a boolean'),

    (req, res, next) => {
        console.log('Create Repository - Validation started');
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const updateRepository = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    body('name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage('Repository name must be between 1 and 100 characters'),

    body('fullName')
        .optional()
        .trim(),

    body('url')
        .optional()
        .trim()
        .isURL().withMessage('Invalid repository URL'),

    body('defaultBranch')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage('Default branch must be between 1 and 50 characters'),

    body('selectedBranch')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage('Selected branch must be between 1 and 50 characters'),

    body('isPrivate')
        .optional()
        .isBoolean().withMessage('Is private must be a boolean'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),

    body('language')
        .optional()
        .trim(),

    body('connection.syncFrequency')
        .optional()
        .isIn(['manual', 'hourly', 'daily', 'weekly', 'on-commit'])
        .withMessage('Sync frequency must be manual, hourly, daily, weekly, or on-commit'),

    body('connection.autoSync')
        .optional()
        .isBoolean().withMessage('Auto sync must be a boolean'),

    body('permissions.canRead')
        .optional()
        .isBoolean().withMessage('Can read must be a boolean'),

    body('permissions.canWrite')
        .optional()
        .isBoolean().withMessage('Can write must be a boolean'),

    body('permissions.canAdmin')
        .optional()
        .isBoolean().withMessage('Can admin must be a boolean'),

    (req, res, next) => {
        console.log('Update Repository - Validation started');
        console.log('Repository ID:', req.params.id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const getRepository = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    (req, res, next) => {
        console.log('Get Repository - Validation started');
        console.log('Repository ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const deleteRepository = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    (req, res, next) => {
        console.log('Delete Repository - Validation started');
        console.log('Repository ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const listRepositories = [
    query('project')
        .optional()
        .isMongoId().withMessage('Invalid project ID format'),

    query('provider')
        .optional()
        .isIn(['github', 'gitlab', 'bitbucket', 'azure-devops'])
        .withMessage('Provider must be github, gitlab, bitbucket, or azure-devops'),

    query('status')
        .optional()
        .isIn(['connected', 'disconnected', 'error', 'syncing'])
        .withMessage('Status must be connected, disconnected, error, or syncing'),

    query('analysisStatus')
        .optional()
        .isIn(['pending', 'in-progress', 'completed', 'failed'])
        .withMessage('Analysis status must be pending, in-progress, completed, or failed'),

    query('isPrivate')
        .optional()
        .isBoolean().withMessage('Is private must be a boolean'),

    query('isActive')
        .optional()
        .isBoolean().withMessage('Is active must be a boolean'),

    query('language')
        .optional()
        .trim(),

    query('search')
        .optional()
        .trim(),

    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

    query('sortBy')
        .optional()
        .isString().withMessage('Sort by must be a string'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc', '1', '-1'])
        .withMessage('Sort order must be asc, desc, 1, or -1'),

    (req, res, next) => {
        console.log('List Repositories - Validation started');
        console.log('Query Parameters:', JSON.stringify(req.query, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const syncRepository = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    body('force')
        .optional()
        .isBoolean().withMessage('Force must be a boolean'),

    (req, res, next) => {
        console.log('Sync Repository - Validation started');
        console.log('Repository ID:', req.params.id);
        console.log('Force Sync:', req.body.force);
        handleValidationErrors(req, res, next);
    }
];

const analyzeRepository = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    body('forceReanalyze')
        .optional()
        .isBoolean().withMessage('Force reanalyze must be a boolean'),

    body('analyzeFiles')
        .optional()
        .isBoolean().withMessage('Analyze files must be a boolean'),

    (req, res, next) => {
        console.log('Analyze Repository - Validation started');
        console.log('Repository ID:', req.params.id);
        console.log('Force Reanalyze:', req.body.forceReanalyze);
        handleValidationErrors(req, res, next);
    }
];

const getBranches = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    (req, res, next) => {
        console.log('Get Branches - Validation started');
        console.log('Repository ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const switchBranch = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    body('branch')
        .notEmpty().withMessage('Branch name is required')
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage('Branch name must be between 1 and 50 characters'),

    (req, res, next) => {
        console.log('Switch Branch - Validation started');
        console.log('Repository ID:', req.params.id);
        console.log('Branch:', req.body.branch);
        handleValidationErrors(req, res, next);
    }
];

const getCommits = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    query('branch')
        .optional()
        .trim(),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    (req, res, next) => {
        console.log('Get Commits - Validation started');
        console.log('Repository ID:', req.params.id);
        console.log('Query Parameters:', JSON.stringify(req.query, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const getFileContent = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    query('path')
        .notEmpty().withMessage('File path is required')
        .trim(),

    query('branch')
        .optional()
        .trim(),

    (req, res, next) => {
        console.log('Get File Content - Validation started');
        console.log('Repository ID:', req.params.id);
        console.log('File Path:', req.query.path);
        handleValidationErrors(req, res, next);
    }
];

const getStructure = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    query('path')
        .optional()
        .trim(),

    query('recursive')
        .optional()
        .isBoolean().withMessage('Recursive must be a boolean'),

    (req, res, next) => {
        console.log('Get Structure - Validation started');
        console.log('Repository ID:', req.params.id);
        console.log('Path:', req.query.path);
        handleValidationErrors(req, res, next);
    }
];

const configureWebhook = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    body('events')
        .notEmpty().withMessage('Webhook events are required')
        .isArray().withMessage('Events must be an array'),

    body('events.*')
        .isIn(['push', 'pull_request', 'release', 'commit'])
        .withMessage('Invalid webhook event'),

    body('active')
        .optional()
        .isBoolean().withMessage('Active must be a boolean'),

    (req, res, next) => {
        console.log('Configure Webhook - Validation started');
        console.log('Repository ID:', req.params.id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const removeWebhook = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    (req, res, next) => {
        console.log('Remove Webhook - Validation started');
        console.log('Repository ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const updateAuthentication = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    body('type')
        .notEmpty().withMessage('Authentication type is required')
        .isIn(['oauth', 'token', 'ssh'])
        .withMessage('Authentication type must be oauth, token, or ssh'),

    body('accessToken')
        .optional()
        .trim(),

    body('refreshToken')
        .optional()
        .trim(),

    body('tokenExpiry')
        .optional()
        .isISO8601().withMessage('Token expiry must be a valid ISO 8601 date'),

    body('sshKey')
        .optional()
        .trim(),

    body('username')
        .optional()
        .trim(),

    (req, res, next) => {
        console.log('Update Authentication - Validation started');
        console.log('Repository ID:', req.params.id);
        console.log('Authentication Type:', req.body.type);
        handleValidationErrors(req, res, next);
    }
];

const updateSyncSettings = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    body('syncFrequency')
        .optional()
        .isIn(['manual', 'hourly', 'daily', 'weekly', 'on-commit'])
        .withMessage('Sync frequency must be manual, hourly, daily, weekly, or on-commit'),

    body('autoSync')
        .optional()
        .isBoolean().withMessage('Auto sync must be a boolean'),

    (req, res, next) => {
        console.log('Update Sync Settings - Validation started');
        console.log('Repository ID:', req.params.id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const disconnectRepository = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    (req, res, next) => {
        console.log('Disconnect Repository - Validation started');
        console.log('Repository ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const reconnectRepository = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    body('accessToken')
        .optional()
        .trim(),

    (req, res, next) => {
        console.log('Reconnect Repository - Validation started');
        console.log('Repository ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const getAnalysisStatus = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    (req, res, next) => {
        console.log('Get Analysis Status - Validation started');
        console.log('Repository ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const getSyncHistory = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

    (req, res, next) => {
        console.log('Get Sync History - Validation started');
        console.log('Repository ID:', req.params.id);
        console.log('Limit:', req.query.limit);
        handleValidationErrors(req, res, next);
    }
];

const getAnalysisFindings = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    query('type')
        .optional()
        .isIn(['routes', 'controllers', 'models', 'services', 'middlewares', 'endpoints'])
        .withMessage('Type must be routes, controllers, models, services, middlewares, or endpoints'),

    (req, res, next) => {
        console.log('Get Analysis Findings - Validation started');
        console.log('Repository ID:', req.params.id);
        console.log('Type:', req.query.type);
        handleValidationErrors(req, res, next);
    }
];

const getRepositoryFiles = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    query('category')
        .optional()
        .isIn(['routes', 'controllers', 'models', 'services', 'configs'])
        .withMessage('Category must be routes, controllers, models, services, or configs'),

    query('analyzed')
        .optional()
        .isBoolean().withMessage('Analyzed must be a boolean'),

    (req, res, next) => {
        console.log('Get Repository Files - Validation started');
        console.log('Repository ID:', req.params.id);
        console.log('Category:', req.query.category);
        handleValidationErrors(req, res, next);
    }
];

const updatePermissions = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    body('canRead')
        .optional()
        .isBoolean().withMessage('Can read must be a boolean'),

    body('canWrite')
        .optional()
        .isBoolean().withMessage('Can write must be a boolean'),

    body('canAdmin')
        .optional()
        .isBoolean().withMessage('Can admin must be a boolean'),

    (req, res, next) => {
        console.log('Update Permissions - Validation started');
        console.log('Repository ID:', req.params.id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const testConnection = [
    param('id')
        .notEmpty().withMessage('Repository ID is required')
        .isMongoId().withMessage('Invalid repository ID format'),

    (req, res, next) => {
        console.log('Test Connection - Validation started');
        console.log('Repository ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

module.exports = {
    createRepository,
    updateRepository,
    getRepository,
    deleteRepository,
    listRepositories,
    syncRepository,
    analyzeRepository,
    getBranches,
    switchBranch,
    getCommits,
    getFileContent,
    getStructure,
    configureWebhook,
    removeWebhook,
    updateAuthentication,
    updateSyncSettings,
    disconnectRepository,
    reconnectRepository,
    getAnalysisStatus,
    getSyncHistory,
    getAnalysisFindings,
    getRepositoryFiles,
    updatePermissions,
    testConnection
};