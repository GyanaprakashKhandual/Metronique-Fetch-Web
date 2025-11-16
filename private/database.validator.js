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

const createDatabaseConnection = [
    body('project')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format'),

    body('name')
        .notEmpty().withMessage('Connection name is required')
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('Connection name must be between 3 and 100 characters'),

    body('type')
        .notEmpty().withMessage('Database type is required')
        .isIn(['mongodb', 'mysql', 'postgresql', 'sqlite', 'mssql', 'oracle', 'redis', 'dynamodb', 'cassandra', 'mariadb'])
        .withMessage('Invalid database type'),

    body('environment')
        .optional()
        .isIn(['development', 'staging', 'production', 'test'])
        .withMessage('Invalid environment type'),

    body('connection.host')
        .notEmpty().withMessage('Host is required')
        .trim(),

    body('connection.port')
        .notEmpty().withMessage('Port is required')
        .isInt({ min: 1, max: 65535 }).withMessage('Port must be between 1 and 65535'),

    body('connection.database')
        .notEmpty().withMessage('Database name is required')
        .trim(),

    body('connection.username')
        .notEmpty().withMessage('Username is required')
        .trim(),

    body('connection.password')
        .notEmpty().withMessage('Password is required'),

    body('connection.authSource')
        .optional()
        .trim(),

    body('connection.replicaSet')
        .optional()
        .trim(),

    body('connection.ssl.enabled')
        .optional()
        .isBoolean().withMessage('SSL enabled must be a boolean'),

    body('connection.ssl.rejectUnauthorized')
        .optional()
        .isBoolean().withMessage('SSL rejectUnauthorized must be a boolean'),

    body('connection.ssl.ca')
        .optional()
        .isString().withMessage('SSL CA must be a string'),

    body('connection.ssl.cert')
        .optional()
        .isString().withMessage('SSL cert must be a string'),

    body('connection.ssl.key')
        .optional()
        .isString().withMessage('SSL key must be a string'),

    body('connectionString')
        .optional()
        .trim(),

    body('options.maxPoolSize')
        .optional()
        .isInt({ min: 1, max: 1000 }).withMessage('Max pool size must be between 1 and 1000'),

    body('options.minPoolSize')
        .optional()
        .isInt({ min: 0, max: 100 }).withMessage('Min pool size must be between 0 and 100'),

    body('options.connectTimeout')
        .optional()
        .isInt({ min: 1000, max: 300000 }).withMessage('Connect timeout must be between 1000 and 300000 milliseconds'),

    body('options.socketTimeout')
        .optional()
        .isInt({ min: 1000, max: 300000 }).withMessage('Socket timeout must be between 1000 and 300000 milliseconds'),

    body('options.keepAlive')
        .optional()
        .isBoolean().withMessage('Keep alive must be a boolean'),

    body('permissions.canRead')
        .optional()
        .isBoolean().withMessage('Can read must be a boolean'),

    body('permissions.canWrite')
        .optional()
        .isBoolean().withMessage('Can write must be a boolean'),

    body('permissions.canDelete')
        .optional()
        .isBoolean().withMessage('Can delete must be a boolean'),

    body('permissions.canExecute')
        .optional()
        .isBoolean().withMessage('Can execute must be a boolean'),

    body('alerts.connectionFailure.enabled')
        .optional()
        .isBoolean().withMessage('Connection failure alert must be a boolean'),

    body('alerts.connectionFailure.recipients')
        .optional()
        .isArray().withMessage('Recipients must be an array'),

    body('alerts.connectionFailure.recipients.*')
        .optional()
        .isEmail().withMessage('Each recipient must be a valid email'),

    body('alerts.slowQueries.enabled')
        .optional()
        .isBoolean().withMessage('Slow queries alert must be a boolean'),

    body('alerts.slowQueries.threshold')
        .optional()
        .isInt({ min: 100, max: 60000 }).withMessage('Threshold must be between 100 and 60000 milliseconds'),

    body('security.rotateCredentials.enabled')
        .optional()
        .isBoolean().withMessage('Rotate credentials must be a boolean'),

    body('security.rotateCredentials.frequency')
        .optional()
        .isIn(['monthly', 'quarterly', 'yearly'])
        .withMessage('Invalid rotation frequency'),

    body('security.ipWhitelist')
        .optional()
        .isArray().withMessage('IP whitelist must be an array'),

    body('security.ipWhitelist.*.ip')
        .optional()
        .trim()
        .isIP().withMessage('Invalid IP address'),

    body('security.ipWhitelist.*.description')
        .optional()
        .trim(),

    body('isDefault')
        .optional()
        .isBoolean().withMessage('Is default must be a boolean'),

    (req, res, next) => {
        console.log('Create Database Connection - Validation started');
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const updateDatabaseConnection = [
    param('id')
        .notEmpty().withMessage('Connection ID is required')
        .isMongoId().withMessage('Invalid connection ID format'),

    body('name')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('Connection name must be between 3 and 100 characters'),

    body('environment')
        .optional()
        .isIn(['development', 'staging', 'production', 'test'])
        .withMessage('Invalid environment type'),

    body('connection.host')
        .optional()
        .trim(),

    body('connection.port')
        .optional()
        .isInt({ min: 1, max: 65535 }).withMessage('Port must be between 1 and 65535'),

    body('connection.database')
        .optional()
        .trim(),

    body('connection.username')
        .optional()
        .trim(),

    body('connection.password')
        .optional(),

    body('connection.authSource')
        .optional()
        .trim(),

    body('connection.replicaSet')
        .optional()
        .trim(),

    body('connection.ssl.enabled')
        .optional()
        .isBoolean().withMessage('SSL enabled must be a boolean'),

    body('connection.ssl.rejectUnauthorized')
        .optional()
        .isBoolean().withMessage('SSL rejectUnauthorized must be a boolean'),

    body('status')
        .optional()
        .isIn(['active', 'inactive', 'error', 'testing'])
        .withMessage('Invalid status'),

    body('options.maxPoolSize')
        .optional()
        .isInt({ min: 1, max: 1000 }).withMessage('Max pool size must be between 1 and 1000'),

    body('options.minPoolSize')
        .optional()
        .isInt({ min: 0, max: 100 }).withMessage('Min pool size must be between 0 and 100'),

    body('permissions.canRead')
        .optional()
        .isBoolean().withMessage('Can read must be a boolean'),

    body('permissions.canWrite')
        .optional()
        .isBoolean().withMessage('Can write must be a boolean'),

    body('permissions.canDelete')
        .optional()
        .isBoolean().withMessage('Can delete must be a boolean'),

    body('permissions.canExecute')
        .optional()
        .isBoolean().withMessage('Can execute must be a boolean'),

    body('isDefault')
        .optional()
        .isBoolean().withMessage('Is default must be a boolean'),

    body('isActive')
        .optional()
        .isBoolean().withMessage('Is active must be a boolean'),

    (req, res, next) => {
        console.log('Update Database Connection - Validation started');
        console.log('Connection ID:', req.params.id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const getDatabaseConnection = [
    param('id')
        .notEmpty().withMessage('Connection ID is required')
        .isMongoId().withMessage('Invalid connection ID format'),

    (req, res, next) => {
        console.log('Get Database Connection - Validation started');
        console.log('Connection ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const deleteDatabaseConnection = [
    param('id')
        .notEmpty().withMessage('Connection ID is required')
        .isMongoId().withMessage('Invalid connection ID format'),

    (req, res, next) => {
        console.log('Delete Database Connection - Validation started');
        console.log('Connection ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const listDatabaseConnections = [
    query('project')
        .optional()
        .isMongoId().withMessage('Invalid project ID format'),

    query('type')
        .optional()
        .isIn(['mongodb', 'mysql', 'postgresql', 'sqlite', 'mssql', 'oracle', 'redis', 'dynamodb', 'cassandra', 'mariadb'])
        .withMessage('Invalid database type'),

    query('environment')
        .optional()
        .isIn(['development', 'staging', 'production', 'test'])
        .withMessage('Invalid environment type'),

    query('status')
        .optional()
        .isIn(['active', 'inactive', 'error', 'testing'])
        .withMessage('Invalid status'),

    query('isActive')
        .optional()
        .isBoolean().withMessage('Is active must be a boolean'),

    query('isDefault')
        .optional()
        .isBoolean().withMessage('Is default must be a boolean'),

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
        console.log('List Database Connections - Validation started');
        console.log('Query Parameters:', JSON.stringify(req.query, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const testConnection = [
    param('id')
        .notEmpty().withMessage('Connection ID is required')
        .isMongoId().withMessage('Invalid connection ID format'),

    (req, res, next) => {
        console.log('Test Connection - Validation started');
        console.log('Connection ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const analyzeSchema = [
    param('id')
        .notEmpty().withMessage('Connection ID is required')
        .isMongoId().withMessage('Invalid connection ID format'),

    (req, res, next) => {
        console.log('Analyze Schema - Validation started');
        console.log('Connection ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const updateSchemaData = [
    param('id')
        .notEmpty().withMessage('Connection ID is required')
        .isMongoId().withMessage('Invalid connection ID format'),

    body('collections')
        .optional()
        .isArray().withMessage('Collections must be an array'),

    body('collections.*.name')
        .optional()
        .isString().withMessage('Collection name must be a string'),

    body('collections.*.count')
        .optional()
        .isInt({ min: 0 }).withMessage('Collection count must be a non-negative integer'),

    body('collections.*.size')
        .optional()
        .isInt({ min: 0 }).withMessage('Collection size must be a non-negative integer'),

    body('tables')
        .optional()
        .isArray().withMessage('Tables must be an array'),

    body('tables.*.name')
        .optional()
        .isString().withMessage('Table name must be a string'),

    body('tables.*.schema')
        .optional()
        .isString().withMessage('Table schema must be a string'),

    body('tables.*.rowCount')
        .optional()
        .isInt({ min: 0 }).withMessage('Row count must be a non-negative integer'),

    body('relationships')
        .optional()
        .isArray().withMessage('Relationships must be an array'),

    (req, res, next) => {
        console.log('Update Schema Data - Validation started');
        console.log('Connection ID:', req.params.id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const addIpToWhitelist = [
    param('id')
        .notEmpty().withMessage('Connection ID is required')
        .isMongoId().withMessage('Invalid connection ID format'),

    body('ip')
        .notEmpty().withMessage('IP address is required')
        .trim()
        .isIP().withMessage('Invalid IP address format'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('Description must be less than 200 characters'),

    (req, res, next) => {
        console.log('Add IP to Whitelist - Validation started');
        console.log('Connection ID:', req.params.id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        handleValidationErrors(req, res, next);
    }
];

const removeIpFromWhitelist = [
    param('id')
        .notEmpty().withMessage('Connection ID is required')
        .isMongoId().withMessage('Invalid connection ID format'),

    body('ip')
        .notEmpty().withMessage('IP address is required')
        .trim()
        .isIP().withMessage('Invalid IP address format'),

    (req, res, next) => {
        console.log('Remove IP from Whitelist - Validation started');
        console.log('Connection ID:', req.params.id);
        console.log('IP Address:', req.body.ip);
        handleValidationErrors(req, res, next);
    }
];

const makeDefaultConnection = [
    param('id')
        .notEmpty().withMessage('Connection ID is required')
        .isMongoId().withMessage('Invalid connection ID format'),

    (req, res, next) => {
        console.log('Make Default Connection - Validation started');
        console.log('Connection ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const disconnectConnection = [
    param('id')
        .notEmpty().withMessage('Connection ID is required')
        .isMongoId().withMessage('Invalid connection ID format'),

    (req, res, next) => {
        console.log('Disconnect Connection - Validation started');
        console.log('Connection ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const getConnectionStatistics = [
    param('id')
        .notEmpty().withMessage('Connection ID is required')
        .isMongoId().withMessage('Invalid connection ID format'),

    (req, res, next) => {
        console.log('Get Connection Statistics - Validation started');
        console.log('Connection ID:', req.params.id);
        handleValidationErrors(req, res, next);
    }
];

const getTestHistory = [
    param('id')
        .notEmpty().withMessage('Connection ID is required')
        .isMongoId().withMessage('Invalid connection ID format'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

    (req, res, next) => {
        console.log('Get Test History - Validation started');
        console.log('Connection ID:', req.params.id);
        console.log('Query Parameters:', JSON.stringify(req.query, null, 2));
        handleValidationErrors(req, res, next);
    }
];

module.exports = {
    createDatabaseConnection,
    updateDatabaseConnection,
    getDatabaseConnection,
    deleteDatabaseConnection,
    listDatabaseConnections,
    testConnection,
    analyzeSchema,
    updateSchemaData,
    addIpToWhitelist,
    removeIpFromWhitelist,
    makeDefaultConnection,
    disconnectConnection,
    getConnectionStatistics,
    getTestHistory
};