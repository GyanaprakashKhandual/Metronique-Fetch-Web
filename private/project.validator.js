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

const createProject = [
    body('name')
        .notEmpty().withMessage('Project name is required')
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('Project name must be between 3 and 100 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),

    body('team')
        .optional()
        .isMongoId().withMessage('Invalid team ID format'),

    body('visibility')
        .optional()
        .isIn(['private', 'team', 'public'])
        .withMessage('Visibility must be private, team, or public'),

    body('technology.language')
        .optional()
        .isIn(['javascript', 'typescript', 'java', 'python', 'csharp', 'go', 'php', 'ruby'])
        .withMessage('Invalid programming language'),

    body('technology.framework')
        .optional()
        .isIn(['express', 'nestjs', 'fastify', 'spring-boot', 'django', 'flask', 'dotnet-core', 'laravel', 'rails'])
        .withMessage('Invalid framework'),

    body('technology.database')
        .optional()
        .isArray().withMessage('Database must be an array'),

    body('technology.database.*')
        .optional()
        .isIn(['mongodb', 'mysql', 'postgresql', 'sqlite', 'mssql', 'oracle', 'redis', 'dynamodb'])
        .withMessage('Invalid database type'),

    body('technology.orm')
        .optional()
        .isIn(['mongoose', 'sequelize', 'typeorm', 'prisma', 'hibernate', 'sqlalchemy', 'entity-framework'])
        .withMessage('Invalid ORM'),

    body('category')
        .optional()
        .isIn(['web-api', 'mobile-api', 'microservice', 'internal', 'external', 'third-party'])
        .withMessage('Invalid category'),

    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Invalid priority'),

    body('tags')
        .optional()
        .isArray().withMessage('Tags must be an array'),

    body('tags.*')
        .optional()
        .isString().withMessage('Each tag must be a string')
        .trim(),

    body('metadata.color')
        .optional()
        .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex color code'),

    body('metadata.icon')
        .optional()
        .isString().withMessage('Icon must be a string'),

    (req, res, next) => {
        console.log('Create Project - Validation started');
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const updateProject = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    body('name')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('Project name must be between 3 and 100 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),

    body('visibility')
        .optional()
        .isIn(['private', 'team', 'public'])
        .withMessage('Visibility must be private, team, or public'),

    body('team')
        .optional()
        .isMongoId().withMessage('Invalid team ID format'),

    body('technology.language')
        .optional()
        .isIn(['javascript', 'typescript', 'java', 'python', 'csharp', 'go', 'php', 'ruby'])
        .withMessage('Invalid programming language'),

    body('technology.framework')
        .optional()
        .isIn(['express', 'nestjs', 'fastify', 'spring-boot', 'django', 'flask', 'dotnet-core', 'laravel', 'rails'])
        .withMessage('Invalid framework'),

    body('technology.database')
        .optional()
        .isArray().withMessage('Database must be an array'),

    body('technology.orm')
        .optional()
        .isIn(['mongoose', 'sequelize', 'typeorm', 'prisma', 'hibernate', 'sqlalchemy', 'entity-framework'])
        .withMessage('Invalid ORM'),

    body('status')
        .optional()
        .isIn(['draft', 'active', 'inactive', 'archived', 'maintenance'])
        .withMessage('Invalid status'),

    body('category')
        .optional()
        .isIn(['web-api', 'mobile-api', 'microservice', 'internal', 'external', 'third-party'])
        .withMessage('Invalid category'),

    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Invalid priority'),

    body('tags')
        .optional()
        .isArray().withMessage('Tags must be an array'),

    body('metadata.color')
        .optional()
        .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex color code'),

    body('metadata.starred')
        .optional()
        .isBoolean().withMessage('Starred must be a boolean'),

    body('metadata.favorite')
        .optional()
        .isBoolean().withMessage('Favorite must be a boolean'),

    (req, res, next) => {
        console.log('Update Project - Validation started');
        console.log('Project ID:', req.params.id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const getProject = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    (req, res, next) => {
        console.log('Get Project - Validation started');
        console.log('Project ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const deleteProject = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    (req, res, next) => {
        console.log('Delete Project - Validation started');
        console.log('Project ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const listProjects = [
    query('status')
        .optional()
        .isIn(['draft', 'active', 'inactive', 'archived', 'maintenance'])
        .withMessage('Invalid status'),

    query('visibility')
        .optional()
        .isIn(['private', 'team', 'public'])
        .withMessage('Invalid visibility'),

    query('category')
        .optional()
        .isIn(['web-api', 'mobile-api', 'microservice', 'internal', 'external', 'third-party'])
        .withMessage('Invalid category'),

    query('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Invalid priority'),

    query('team')
        .optional()
        .isMongoId().withMessage('Invalid team ID format'),

    query('language')
        .optional()
        .isIn(['javascript', 'typescript', 'java', 'python', 'csharp', 'go', 'php', 'ruby'])
        .withMessage('Invalid programming language'),

    query('framework')
        .optional()
        .isIn(['express', 'nestjs', 'fastify', 'spring-boot', 'django', 'flask', 'dotnet-core', 'laravel', 'rails'])
        .withMessage('Invalid framework'),

    query('starred')
        .optional()
        .isBoolean().withMessage('Starred must be a boolean'),

    query('favorite')
        .optional()
        .isBoolean().withMessage('Favorite must be a boolean'),

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
        console.log('List Projects - Validation started');
        console.log('Query Parameters:', JSON.stringify(req.query, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const connectRepository = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    body('url')
        .notEmpty().withMessage('Repository URL is required')
        .trim()
        .isURL().withMessage('Invalid repository URL'),

    body('fullName')
        .notEmpty().withMessage('Repository full name is required')
        .trim(),

    body('owner')
        .notEmpty().withMessage('Repository owner is required')
        .trim(),

    body('name')
        .notEmpty().withMessage('Repository name is required')
        .trim(),

    body('branch')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage('Branch name must be between 1 and 50 characters'),

    body('accessToken')
        .notEmpty().withMessage('Access token is required')
        .trim(),

    body('webhookSecret')
        .optional()
        .trim(),

    (req, res, next) => {
        console.log('Connect Repository - Validation started');
        console.log('Project ID:', req.params.id);
        console.log('Repository URL:', req.body.url);
        handleValidationErrors(req, res, next);
    }
];

const disconnectRepository = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    (req, res, next) => {
        console.log('Disconnect Repository - Validation started');
        console.log('Project ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const syncRepository = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    (req, res, next) => {
        console.log('Sync Repository - Validation started');
        console.log('Project ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const analyzeProject = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    body('aiProvider')
        .optional()
        .isIn(['openai', 'anthropic', 'both'])
        .withMessage('AI provider must be openai, anthropic, or both'),

    (req, res, next) => {
        console.log('Analyze Project - Validation started');
        console.log('Project ID:', req.params.id);
        console.log('AI Provider:', req.body.aiProvider);
        handleValidationErrors(req, res, next);
    }
];

const updateTestConfig = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    body('framework')
        .optional()
        .isIn(['rest-assured', 'cucumber', 'testng', 'jest', 'pytest', 'junit'])
        .withMessage('Invalid test framework'),

    body('language')
        .optional()
        .isIn(['java', 'javascript', 'typescript', 'python'])
        .withMessage('Invalid test language'),

    body('buildTool')
        .optional()
        .isIn(['maven', 'gradle', 'npm', 'pip'])
        .withMessage('Invalid build tool'),

    body('baseUrl')
        .optional()
        .trim()
        .isURL().withMessage('Base URL must be a valid URL'),

    body('timeout')
        .optional()
        .isInt({ min: 1000, max: 300000 }).withMessage('Timeout must be between 1000 and 300000 milliseconds'),

    body('retryCount')
        .optional()
        .isInt({ min: 0, max: 10 }).withMessage('Retry count must be between 0 and 10'),

    body('parallel')
        .optional()
        .isBoolean().withMessage('Parallel must be a boolean'),

    body('threadCount')
        .optional()
        .isInt({ min: 1, max: 20 }).withMessage('Thread count must be between 1 and 20'),

    body('environmentVariables')
        .optional()
        .isArray().withMessage('Environment variables must be an array'),

    body('environmentVariables.*.key')
        .optional()
        .isString().withMessage('Environment variable key must be a string'),

    body('environmentVariables.*.value')
        .optional()
        .isString().withMessage('Environment variable value must be a string'),

    body('environmentVariables.*.isSecret')
        .optional()
        .isBoolean().withMessage('Is secret must be a boolean'),

    body('defaultHeaders')
        .optional()
        .isArray().withMessage('Default headers must be an array'),

    body('defaultHeaders.*.key')
        .optional()
        .isString().withMessage('Header key must be a string'),

    body('defaultHeaders.*.value')
        .optional()
        .isString().withMessage('Header value must be a string'),

    (req, res, next) => {
        console.log('Update Test Config - Validation started');
        console.log('Project ID:', req.params.id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const configureLoadTesting = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    body('enabled')
        .optional()
        .isBoolean().withMessage('Enabled must be a boolean'),

    body('config.virtualUsers')
        .optional()
        .isInt({ min: 1, max: 10000 }).withMessage('Virtual users must be between 1 and 10000'),

    body('config.rampUpTime')
        .optional()
        .isInt({ min: 0, max: 3600 }).withMessage('Ramp up time must be between 0 and 3600 seconds'),

    body('config.duration')
        .optional()
        .isInt({ min: 60, max: 86400 }).withMessage('Duration must be between 60 and 86400 seconds'),

    body('config.requestsPerSecond')
        .optional()
        .isInt({ min: 1, max: 10000 }).withMessage('Requests per second must be between 1 and 10000'),

    (req, res, next) => {
        console.log('Configure Load Testing - Validation started');
        console.log('Project ID:', req.params.id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const configureCICD = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    body('enabled')
        .optional()
        .isBoolean().withMessage('Enabled must be a boolean'),

    body('provider')
        .optional()
        .isIn(['github-actions', 'gitlab-ci', 'jenkins', 'circleci', 'travis-ci', 'azure-devops'])
        .withMessage('Invalid CI/CD provider'),

    body('webhookUrl')
        .optional()
        .trim()
        .isURL().withMessage('Webhook URL must be a valid URL'),

    body('triggerOnCommit')
        .optional()
        .isBoolean().withMessage('Trigger on commit must be a boolean'),

    body('triggerOnPR')
        .optional()
        .isBoolean().withMessage('Trigger on PR must be a boolean'),

    body('autoRun')
        .optional()
        .isBoolean().withMessage('Auto run must be a boolean'),

    body('branch')
        .optional()
        .trim(),

    (req, res, next) => {
        console.log('Configure CI/CD - Validation started');
        console.log('Project ID:', req.params.id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const configureNotifications = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    body('email.enabled')
        .optional()
        .isBoolean().withMessage('Email enabled must be a boolean'),

    body('email.recipients')
        .optional()
        .isArray().withMessage('Email recipients must be an array'),

    body('email.recipients.*')
        .optional()
        .isEmail().withMessage('Each recipient must be a valid email'),

    body('email.onSuccess')
        .optional()
        .isBoolean().withMessage('On success must be a boolean'),

    body('email.onFailure')
        .optional()
        .isBoolean().withMessage('On failure must be a boolean'),

    body('slack.enabled')
        .optional()
        .isBoolean().withMessage('Slack enabled must be a boolean'),

    body('slack.webhookUrl')
        .optional()
        .trim()
        .isURL().withMessage('Slack webhook URL must be a valid URL'),

    body('slack.channel')
        .optional()
        .trim(),

    body('slack.onSuccess')
        .optional()
        .isBoolean().withMessage('On success must be a boolean'),

    body('slack.onFailure')
        .optional()
        .isBoolean().withMessage('On failure must be a boolean'),

    body('webhook.enabled')
        .optional()
        .isBoolean().withMessage('Webhook enabled must be a boolean'),

    body('webhook.url')
        .optional()
        .trim()
        .isURL().withMessage('Webhook URL must be a valid URL'),

    body('webhook.events')
        .optional()
        .isArray().withMessage('Webhook events must be an array'),

    (req, res, next) => {
        console.log('Configure Notifications - Validation started');
        console.log('Project ID:', req.params.id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const configureSchedule = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    body('enabled')
        .optional()
        .isBoolean().withMessage('Enabled must be a boolean'),

    body('cron')
        .optional()
        .trim()
        .matches(/^(\*|[0-5]?\d)(\s+(\*|[01]?\d|2[0-3]))(\s+(\*|0?[1-9]|[12]\d|3[01]))(\s+(\*|0?[1-9]|1[0-2]))(\s+(\*|[0-6]))$/)
        .withMessage('Invalid cron expression'),

    body('timezone')
        .optional()
        .trim()
        .isString().withMessage('Timezone must be a string'),

    (req, res, next) => {
        console.log('Configure Schedule - Validation started');
        console.log('Project ID:', req.params.id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const addCollaborator = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    body('userId')
        .notEmpty().withMessage('User ID is required')
        .isMongoId().withMessage('Invalid user ID format'),

    (req, res, next) => {
        console.log('Add Collaborator - Validation started');
        console.log('Project ID:', req.params.id);
        console.log('User ID:', req.body.userId);
        handleValidationErrors(req, res, next);
    }
];

const removeCollaborator = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    param('userId')
        .notEmpty().withMessage('User ID is required')
        .isMongoId().withMessage('Invalid user ID format'),

    (req, res, next) => {
        console.log('Remove Collaborator - Validation started');
        console.log('Project ID:', req.params.id);
        console.log('User ID:', req.params.userId);
        handleValidationErrors(req, res, next);
    }
];

const uploadFile = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    body('name')
        .notEmpty().withMessage('File name is required')
        .trim(),

    body('type')
        .notEmpty().withMessage('File type is required')
        .trim(),

    body('size')
        .notEmpty().withMessage('File size is required')
        .isInt({ min: 1 }).withMessage('File size must be a positive integer'),

    (req, res, next) => {
        console.log('Upload File - Validation started');
        console.log('Project ID:', req.params.id);
        console.log('File Name:', req.body.name);
        console.log('File Size:', req.body.size);
        handleValidationErrors(req, res, next);
    }
];

const deleteFile = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    param('fileId')
        .notEmpty().withMessage('File ID is required'),

    (req, res, next) => {
        console.log('Delete File - Validation started');
        console.log('Project ID:', req.params.id);
        console.log('File ID:', req.params.fileId);
        handleValidationErrors(req, res, next);
    }
];

const getProjectStats = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    (req, res, next) => {
        console.log('Get Project Stats - Validation started');
        console.log('Project ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const archiveProject = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    (req, res, next) => {
        console.log('Archive Project - Validation started');
        console.log('Project ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const restoreProject = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    (req, res, next) => {
        console.log('Restore Project - Validation started');
        console.log('Project ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const createProjectAccess = [
    body('project')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    body('user')
        .notEmpty().withMessage('User ID is required')
        .isMongoId().withMessage('Invalid user ID format'),

    body('accessLevel')
        .optional()
        .isIn(['view', 'edit', 'admin'])
        .withMessage('Access level must be view, edit, or admin'),

    body('expiresAt')
        .optional()
        .isISO8601().withMessage('Expires at must be a valid ISO 8601 date'),

    body('notifyOnAccess')
        .optional()
        .isBoolean().withMessage('Notify on access must be a boolean'),

    body('metadata.source')
        .optional()
        .isIn(['direct', 'invitation', 'team', 'admin'])
        .withMessage('Source must be direct, invitation, team, or admin'),

    (req, res, next) => {
        console.log('Create Project Access - Validation started');
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const updateProjectAccess = [
    param('id')
        .notEmpty().withMessage('Access ID is required')
        .isMongoId().withMessage('Invalid access ID format'),

    body('accessLevel')
        .optional()
        .isIn(['view', 'edit', 'admin'])
        .withMessage('Access level must be view, edit, or admin'),

    body('status')
        .optional()
        .isIn(['active', 'suspended', 'expired', 'revoked'])
        .withMessage('Invalid status'),

    body('expiresAt')
        .optional()
        .isISO8601().withMessage('Expires at must be a valid ISO 8601 date'),

    body('notifyOnAccess')
        .optional()
        .isBoolean().withMessage('Notify on access must be a boolean'),

    body('permissions')
        .optional()
        .isObject().withMessage('Permissions must be an object'),

    (req, res, next) => {
        console.log('Update Project Access - Validation started');
        console.log('Access ID:', req.params.id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const revokeProjectAccess = [
    param('id')
        .notEmpty().withMessage('Access ID is required')
        .isMongoId().withMessage('Invalid access ID format'),

    body('reason')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('Reason must be less than 200 characters'),

    (req, res, next) => {
        console.log('Revoke Project Access - Validation started');
        console.log('Access ID:', req.params.id);
        console.log('Reason:', req.body.reason);
        handleValidationErrors(req, res, next);
    }
];

const extendProjectAccess = [
    param('id')
        .notEmpty().withMessage('Access ID is required')
        .isMongoId().withMessage('Invalid access ID format'),

    body('days')
        .notEmpty().withMessage('Days is required')
        .isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),

    (req, res, next) => {
        console.log('Extend Project Access - Validation started');
        console.log('Access ID:', req.params.id);
        console.log('Days:', req.body.days);
        handleValidationErrors(req, res, next);
    }
];

const listProjectAccess = [
    query('project')
        .optional()
        .isMongoId().withMessage('Invalid project ID format'),

    query('user')
        .optional()
        .isMongoId().withMessage('Invalid user ID format'),

    query('accessLevel')
        .optional()
        .isIn(['view', 'edit', 'admin'])
        .withMessage('Access level must be view, edit, or admin'),

    query('status')
        .optional()
        .isIn(['active', 'suspended', 'expired', 'revoked'])
        .withMessage('Invalid status'),

    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

    (req, res, next) => {
        console.log('List Project Access - Validation started');
        console.log('Query Parameters:', JSON.stringify(req.query, null, 2));
        handleValidationErrors(req, res, next);
    }
];

module.exports = {
    createProject,
    updateProject,
    getProject,
    deleteProject,
    listProjects,
    connectRepository,
    disconnectRepository,
    syncRepository,
    analyzeProject,
    updateTestConfig,
    configureLoadTesting,
    configureCICD,
    configureNotifications,
    configureSchedule,
    addCollaborator,
    removeCollaborator,
    uploadFile,
    deleteFile,
    getProjectStats,
    archiveProject,
    restoreProject,
    createProjectAccess,
    updateProjectAccess,
    revokeProjectAccess,
    extendProjectAccess,
    listProjectAccess
};