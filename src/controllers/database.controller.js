const DatabaseConnection = require('../models/database.connection.model');
const Project = require('../models/project.model');
const AuditLog = require('../models/audit.model');
const { catchAsync } = require('../utils/error.util');
const encryptionService = require('../services/security/encryption.service');
const connectionService = require('../services/database/connection.service');

const connectDatabase = catchAsync(async (req, res) => {
    const { projectId, type, host, port, database, username, password, connectionString } = req.body;
    console.log(`[DATABASE] Connecting database to project: ${projectId}`);

    if (!projectId || !type) {
        console.warn(`[DATABASE] Connection failed: Missing required fields`);
        return res.status(400).json({
            success: false,
            message: 'Project ID and database type are required',
            code: 'MISSING_FIELDS'
        });
    }

    // Check project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
        });
    }

    const hasAccess = await project.hasAccess(req.user._id);
    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
            code: 'ACCESS_DENIED'
        });
    }

    // Encrypt credentials
    const encryptedPassword = password ? await encryptionService.encrypt(password) : null;
    const encryptedConnectionString = connectionString ? await encryptionService.encrypt(connectionString) : null;

    // Create database connection
    const dbConnection = new DatabaseConnection({
        project: projectId,
        name: `${database || 'database'}_${type}`,
        type: type.toUpperCase(),
        host,
        port: port || getDefaultPort(type),
        database,
        username,
        password: encryptedPassword,
        connectionString: encryptedConnectionString,
        status: 'pending',
        createdBy: req.user._id
    });

    // Test connection
    try {
        const testResult = await connectionService.testConnection(dbConnection);

        if (testResult.success) {
            dbConnection.status = 'connected';
            dbConnection.lastConnectionTest = Date.now();
            dbConnection.isActive = true;
        } else {
            dbConnection.status = 'failed';
            dbConnection.connectionError = testResult.error;
        }
    } catch (error) {
        console.error(`[DATABASE] Connection test failed:`, error);
        dbConnection.status = 'failed';
        dbConnection.connectionError = error.message;
    }

    await dbConnection.save();

    // Add to project
    project.databaseConnections.push(dbConnection._id);
    await project.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'database_connected',
        actionCategory: 'database',
        entityType: 'database',
        entityId: dbConnection._id,
        status: 'success',
        severity: 'info',
        details: { projectId, type, database },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[DATABASE] Database connected: ${dbConnection._id} - Status: ${dbConnection.status}`);

    return res.status(201).json({
        success: true,
        message: dbConnection.status === 'connected'
            ? 'Database connected successfully'
            : 'Database saved but connection test failed',
        data: {
            connection: {
                id: dbConnection._id,
                name: dbConnection.name,
                type: dbConnection.type,
                status: dbConnection.status,
                database: dbConnection.database,
                host: dbConnection.host,
                port: dbConnection.port
            }
        }
    });
});

const getDatabaseConnections = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    console.log(`[DATABASE] Fetching connections for project: ${projectId}`);

    const project = await Project.findById(projectId);
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
        });
    }

    const hasAccess = await project.hasAccess(req.user._id);
    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
            code: 'ACCESS_DENIED'
        });
    }

    const connections = await DatabaseConnection.find({
        project: projectId,
        isDeleted: false
    })
        .select('-password -connectionString')
        .sort({ createdAt: -1 })
        .lean();

    console.log(`[DATABASE] Connections fetched: ${connections.length}`);

    return res.json({
        success: true,
        data: { connections }
    });
});

function getDefaultPort(type) {
    const ports = {
        'mongodb': 27017,
        'mysql': 3306,
        'postgresql': 5432,
        'mssql': 1433,
        'oracle': 1521
    };
    return ports[type.toLowerCase()] || 3306;
}

module.exports = {
    connectDatabase,
    getDatabaseConnections
};