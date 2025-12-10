const DatabaseConnection = require('../models/database.connection.model');
const Project = require('../models/project.model');
const { catchAsync } = require('../utils/error.util');
const crypto = require('crypto');
const mongoose = require('mongoose');

const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ENCRYPTION_IV_LENGTH = 16;

const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    let encrypted = cipher.update(text.toString());
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
    if (!text) return null;
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};

const testMongoDBConnection = async (connectionString) => {
    try {
        const connection = await mongoose.createConnection(connectionString, {
            serverSelectionTimeoutMS: 5000
        });
        await connection.asPromise();
        await connection.close();
        return { success: true, responseTime: Date.now() };
    } catch (error) {
        throw new Error(`MongoDB connection failed: ${error.message}`);
    }
};

const testMySQLConnection = async (config) => {
    const mysql = require('mysql2/promise');
    try {
        const connection = await mysql.createConnection({
            host: config.host,
            port: config.port,
            user: config.username,
            password: config.password,
            database: config.database,
            connectTimeout: 5000
        });
        await connection.ping();
        await connection.end();
        return { success: true, responseTime: Date.now() };
    } catch (error) {
        throw new Error(`MySQL connection failed: ${error.message}`);
    }
};

const testPostgreSQLConnection = async (config) => {
    const { Client } = require('pg');
    try {
        const client = new Client({
            host: config.host,
            port: config.port,
            user: config.username,
            password: config.password,
            database: config.database,
            connectionTimeoutMillis: 5000
        });
        await client.connect();
        await client.query('SELECT 1');
        await client.end();
        return { success: true, responseTime: Date.now() };
    } catch (error) {
        throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }
};

const buildConnectionString = (type, config) => {
    switch (type) {
        case 'mongodb':
            if (config.username && config.password) {
                return `mongodb://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
            }
            return `mongodb://${config.host}:${config.port}/${config.database}`;
        case 'mysql':
            return `mysql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
        case 'postgresql':
            return `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
        default:
            return null;
    }
};

const createDatabaseConnection = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const {
        name,
        type,
        environment = 'development',
        host,
        port,
        database,
        username,
        password,
        authSource,
        ssl = false,
        isDefault = false
    } = req.body;

    console.log(`[DB_CREATE] Project: ${projectId}, Type: ${type}, Name: ${name}`);

    if (!name || !type || !host || !port || !database || !username || !password) {
        return res.status(400).json({
            success: false,
            message: 'All connection fields are required',
            code: 'MISSING_REQUIRED_FIELDS'
        });
    }

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
            message: 'Access denied to this project',
            code: 'PROJECT_ACCESS_DENIED'
        });
    }

    const existingConnection = await DatabaseConnection.findOne({
        project: projectId,
        name: encrypt(name),
        isDeleted: false
    });

    if (existingConnection) {
        return res.status(409).json({
            success: false,
            message: 'Database connection with this name already exists',
            code: 'CONNECTION_EXISTS'
        });
    }

    const connectionString = buildConnectionString(type, { host, port, database, username, password });

    const dbConnection = new DatabaseConnection({
        project: projectId,
        owner: req.user._id,
        name: encrypt(name),
        type: type,
        environment: environment,
        connection: {
            host: encrypt(host),
            port: parseInt(port),
            database: encrypt(database),
            username: encrypt(username),
            password: password,
            authSource: authSource ? encrypt(authSource) : null,
            ssl: {
                enabled: ssl,
                rejectUnauthorized: true
            }
        },
        connectionString: encrypt(connectionString),
        status: 'inactive',
        isDefault: isDefault,
        createdBy: req.user._id,
        security: {
            encrypted: true
        }
    });

    await dbConnection.save();

    if (isDefault) {
        await DatabaseConnection.updateMany(
            { project: projectId, _id: { $ne: dbConnection._id }, isDefault: true },
            { isDefault: false }
        );
    }

    project.databaseConnections.push(dbConnection._id);
    if (project.technology && project.technology.database) {
        if (!project.technology.database.includes(type)) {
            project.technology.database.push(type);
        }
    }
    await project.save();

    console.log(`[DB_CREATE_SUCCESS] Database connection created: ${name}`);

    return res.status(201).json({
        success: true,
        message: 'Database connection created successfully',
        data: {
            connection: {
                id: dbConnection._id,
                name: name,
                type: type,
                environment: environment,
                host: host,
                database: database,
                isDefault: isDefault,
                createdAt: dbConnection.createdAt
            }
        }
    });
});

const testConnection = catchAsync(async (req, res) => {
    const { projectId, connectionId } = req.params;

    console.log(`[DB_TEST] Project: ${projectId}, Connection: ${connectionId}`);

    const dbConnection = await DatabaseConnection.findOne({
        _id: connectionId,
        project: projectId,
        isDeleted: false
    });

    if (!dbConnection) {
        return res.status(404).json({
            success: false,
            message: 'Database connection not found',
            code: 'CONNECTION_NOT_FOUND'
        });
    }

    dbConnection.status = 'testing';
    await dbConnection.save();

    const testStartTime = Date.now();

    try {
        const config = {
            host: decrypt(dbConnection.connection.host),
            port: dbConnection.connection.port,
            database: decrypt(dbConnection.connection.database),
            username: decrypt(dbConnection.connection.username),
            password: dbConnection.decryptPassword()
        };

        let testResult;

        switch (dbConnection.type) {
            case 'mongodb':
                const mongoUri = decrypt(dbConnection.connectionString);
                testResult = await testMongoDBConnection(mongoUri);
                break;
            case 'mysql':
            case 'mariadb':
                testResult = await testMySQLConnection(config);
                break;
            case 'postgresql':
                testResult = await testPostgreSQLConnection(config);
                break;
            default:
                throw new Error('Database type not supported for testing');
        }

        const responseTime = Date.now() - testStartTime;

        dbConnection.status = 'active';
        dbConnection.isConnected = true;
        dbConnection.lastConnectionTest = Date.now();
        dbConnection.lastConnectionStatus = 'success';
        dbConnection.lastConnectionError = undefined;

        dbConnection.testHistory.push({
            testedAt: Date.now(),
            status: 'success',
            responseTime: responseTime,
            testedBy: req.user._id
        });

        if (dbConnection.testHistory.length > 100) {
            dbConnection.testHistory = dbConnection.testHistory.slice(-100);
        }

        await dbConnection.save();

        console.log(`[DB_TEST_SUCCESS] Connection test passed in ${responseTime}ms`);

        return res.json({
            success: true,
            message: 'Database connection test successful',
            data: {
                connection: {
                    id: dbConnection._id,
                    status: 'active',
                    isConnected: true,
                    responseTime: responseTime
                }
            }
        });

    } catch (error) {
        console.log(`[DB_TEST_ERROR] ${error.message}`);

        dbConnection.status = 'error';
        dbConnection.isConnected = false;
        dbConnection.lastConnectionTest = Date.now();
        dbConnection.lastConnectionStatus = 'failed';
        dbConnection.lastConnectionError = error.message;

        dbConnection.testHistory.push({
            testedAt: Date.now(),
            status: 'failed',
            error: error.message,
            testedBy: req.user._id
        });

        await dbConnection.save();

        return res.status(400).json({
            success: false,
            message: 'Database connection test failed',
            error: error.message,
            code: 'CONNECTION_TEST_FAILED'
        });
    }
});

const getDatabaseConnection = catchAsync(async (req, res) => {
    const { projectId, connectionId } = req.params;
    const { includeCredentials = 'false' } = req.query;

    console.log(`[DB_GET] Project: ${projectId}, Connection: ${connectionId}`);

    const dbConnection = await DatabaseConnection.findOne({
        _id: connectionId,
        project: projectId,
        isDeleted: false
    }).populate('createdBy', 'firstName lastName email');

    if (!dbConnection) {
        return res.status(404).json({
            success: false,
            message: 'Database connection not found',
            code: 'CONNECTION_NOT_FOUND'
        });
    }

    const responseData = {
        id: dbConnection._id,
        name: decrypt(dbConnection.name),
        type: dbConnection.type,
        environment: dbConnection.environment,
        host: decrypt(dbConnection.connection.host),
        port: dbConnection.connection.port,
        database: decrypt(dbConnection.connection.database),
        status: dbConnection.status,
        isConnected: dbConnection.isConnected,
        isDefault: dbConnection.isDefault,
        lastConnectionTest: dbConnection.lastConnectionTest,
        lastConnectionStatus: dbConnection.lastConnectionStatus,
        statistics: dbConnection.statistics,
        schema: dbConnection.schema,
        usage: dbConnection.usage,
        permissions: dbConnection.permissions,
        createdAt: dbConnection.createdAt,
        updatedAt: dbConnection.updatedAt
    };

    if (includeCredentials === 'true') {
        responseData.username = decrypt(dbConnection.connection.username);
        responseData.connectionString = decrypt(dbConnection.connectionString);
    }

    return res.json({
        success: true,
        data: {
            connection: responseData
        }
    });
});

const getDatabaseConnectionsByProject = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const { environment, type } = req.query;

    console.log(`[DB_GET_PROJECT] Project: ${projectId}`);

    const project = await Project.findById(projectId);
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
        });
    }

    const query = {
        project: projectId,
        isDeleted: false
    };

    if (environment) {
        query.environment = environment;
    }

    if (type) {
        query.type = type;
    }

    const connections = await DatabaseConnection.find(query)
        .select('name type environment status isConnected isDefault lastConnectionTest lastConnectionStatus createdAt')
        .sort({ isDefault: -1, createdAt: -1 });

    const decryptedConnections = connections.map(conn => ({
        id: conn._id,
        name: decrypt(conn.name),
        type: conn.type,
        environment: conn.environment,
        status: conn.status,
        isConnected: conn.isConnected,
        isDefault: conn.isDefault,
        lastConnectionTest: conn.lastConnectionTest,
        lastConnectionStatus: conn.lastConnectionStatus,
        createdAt: conn.createdAt
    }));

    return res.json({
        success: true,
        data: {
            connections: decryptedConnections,
            count: decryptedConnections.length
        }
    });
});

const updateDatabaseConnection = catchAsync(async (req, res) => {
    const { projectId, connectionId } = req.params;
    const {
        name,
        host,
        port,
        database,
        username,
        password,
        environment,
        isDefault
    } = req.body;

    console.log(`[DB_UPDATE] Project: ${projectId}, Connection: ${connectionId}`);

    const dbConnection = await DatabaseConnection.findOne({
        _id: connectionId,
        project: projectId,
        isDeleted: false
    });

    if (!dbConnection) {
        return res.status(404).json({
            success: false,
            message: 'Database connection not found',
            code: 'CONNECTION_NOT_FOUND'
        });
    }

    if (name) {
        const existingConnection = await DatabaseConnection.findOne({
            project: projectId,
            name: encrypt(name),
            _id: { $ne: connectionId },
            isDeleted: false
        });

        if (existingConnection) {
            return res.status(409).json({
                success: false,
                message: 'Database connection with this name already exists',
                code: 'CONNECTION_NAME_EXISTS'
            });
        }

        dbConnection.name = encrypt(name);
    }

    if (host) dbConnection.connection.host = encrypt(host);
    if (port) dbConnection.connection.port = parseInt(port);
    if (database) dbConnection.connection.database = encrypt(database);
    if (username) dbConnection.connection.username = encrypt(username);
    if (password) dbConnection.connection.password = password;
    if (environment) dbConnection.environment = environment;

    if (host || port || database || username || password) {
        const config = {
            host: host || decrypt(dbConnection.connection.host),
            port: port || dbConnection.connection.port,
            database: database || decrypt(dbConnection.connection.database),
            username: username || decrypt(dbConnection.connection.username),
            password: password || dbConnection.decryptPassword()
        };

        const connectionString = buildConnectionString(dbConnection.type, config);
        dbConnection.connectionString = encrypt(connectionString);
        dbConnection.isConnected = false;
        dbConnection.status = 'inactive';
    }

    if (isDefault !== undefined) {
        if (isDefault) {
            await DatabaseConnection.updateMany(
                { project: projectId, _id: { $ne: connectionId }, isDefault: true },
                { isDefault: false }
            );
        }
        dbConnection.isDefault = isDefault;
    }

    dbConnection.updatedBy = req.user._id;
    await dbConnection.save();

    console.log(`[DB_UPDATE_SUCCESS] Connection updated`);

    return res.json({
        success: true,
        message: 'Database connection updated successfully',
        data: {
            connection: {
                id: dbConnection._id,
                name: name || decrypt(dbConnection.name),
                type: dbConnection.type,
                environment: dbConnection.environment,
                status: dbConnection.status,
                isDefault: dbConnection.isDefault,
                updatedAt: dbConnection.updatedAt
            }
        }
    });
});

const analyzeSchema = catchAsync(async (req, res) => {
    const { projectId, connectionId } = req.params;

    console.log(`[DB_ANALYZE] Project: ${projectId}, Connection: ${connectionId}`);

    const dbConnection = await DatabaseConnection.findOne({
        _id: connectionId,
        project: projectId,
        isDeleted: false
    });

    if (!dbConnection) {
        return res.status(404).json({
            success: false,
            message: 'Database connection not found',
            code: 'CONNECTION_NOT_FOUND'
        });
    }

    if (!dbConnection.isConnected) {
        return res.status(400).json({
            success: false,
            message: 'Database is not connected. Test connection first',
            code: 'NOT_CONNECTED'
        });
    }

    try {
        const config = {
            host: decrypt(dbConnection.connection.host),
            port: dbConnection.connection.port,
            database: decrypt(dbConnection.connection.database),
            username: decrypt(dbConnection.connection.username),
            password: dbConnection.decryptPassword()
        };

        let schemaData = {};

        if (dbConnection.type === 'mongodb') {
            const mongoUri = decrypt(dbConnection.connectionString);
            const connection = await mongoose.createConnection(mongoUri);

            const collections = await connection.db.listCollections().toArray();
            const collectionsData = [];

            for (const collection of collections.slice(0, 20)) {
                const collectionName = collection.name;
                const stats = await connection.db.collection(collectionName).stats();
                const indexes = await connection.db.collection(collectionName).indexes();

                collectionsData.push({
                    name: collectionName,
                    count: stats.count,
                    size: stats.size,
                    indexes: indexes.map(idx => ({
                        name: idx.name,
                        keys: idx.key,
                        unique: idx.unique || false
                    }))
                });
            }

            schemaData.collections = collectionsData;
            await connection.close();

        } else if (dbConnection.type === 'mysql' || dbConnection.type === 'mariadb') {
            const mysql = require('mysql2/promise');
            const connection = await mysql.createConnection(config);

            const [tables] = await connection.query(`
                SELECT TABLE_NAME, TABLE_ROWS 
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = ?
            `, [config.database]);

            const tablesData = [];

            for (const table of tables.slice(0, 20)) {
                const [columns] = await connection.query(`
                    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
                `, [config.database, table.TABLE_NAME]);

                const [indexes] = await connection.query(`
                    SHOW INDEX FROM ${table.TABLE_NAME}
                `);

                tablesData.push({
                    name: table.TABLE_NAME,
                    rowCount: table.TABLE_ROWS,
                    columns: columns.map(col => ({
                        name: col.COLUMN_NAME,
                        type: col.DATA_TYPE,
                        nullable: col.IS_NULLABLE === 'YES',
                        defaultValue: col.COLUMN_DEFAULT,
                        isPrimaryKey: col.COLUMN_KEY === 'PRI'
                    })),
                    indexes: [...new Set(indexes.map(idx => idx.Key_name))].map(name => ({
                        name: name,
                        unique: indexes.find(idx => idx.Key_name === name).Non_unique === 0
                    }))
                });
            }

            schemaData.tables = tablesData;
            await connection.end();

        } else if (dbConnection.type === 'postgresql') {
            const { Client } = require('pg');
            const client = new Client(config);
            await client.connect();

            const tablesResult = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            `);

            const tablesData = [];

            for (const table of tablesResult.rows.slice(0, 20)) {
                const columnsResult = await client.query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = $1
                `, [table.table_name]);

                tablesData.push({
                    name: table.table_name,
                    columns: columnsResult.rows.map(col => ({
                        name: col.column_name,
                        type: col.data_type,
                        nullable: col.is_nullable === 'YES',
                        defaultValue: col.column_default
                    }))
                });
            }

            schemaData.tables = tablesData;
            await client.end();
        }

        await dbConnection.updateSchema(schemaData);

        console.log(`[DB_ANALYZE_SUCCESS] Schema analyzed`);

        return res.json({
            success: true,
            message: 'Database schema analyzed successfully',
            data: {
                schema: schemaData,
                statistics: dbConnection.statistics
            }
        });

    } catch (error) {
        console.log(`[DB_ANALYZE_ERROR] ${error.message}`);

        return res.status(500).json({
            success: false,
            message: 'Failed to analyze database schema',
            error: error.message,
            code: 'SCHEMA_ANALYSIS_FAILED'
        });
    }
});

const getConnectionForTesting = catchAsync(async (req, res) => {
    const { projectId, connectionId } = req.params;

    console.log(`[DB_GET_FOR_TESTING] Project: ${projectId}, Connection: ${connectionId}`);

    const dbConnection = await DatabaseConnection.findOne({
        _id: connectionId,
        project: projectId,
        isDeleted: false
    });

    if (!dbConnection) {
        return res.status(404).json({
            success: false,
            message: 'Database connection not found',
            code: 'CONNECTION_NOT_FOUND'
        });
    }

    if (!dbConnection.isConnected) {
        return res.status(400).json({
            success: false,
            message: 'Database is not connected',
            code: 'NOT_CONNECTED'
        });
    }

    await dbConnection.incrementUsage(0);

    const connectionConfig = {
        type: dbConnection.type,
        host: decrypt(dbConnection.connection.host),
        port: dbConnection.connection.port,
        database: decrypt(dbConnection.connection.database),
        username: decrypt(dbConnection.connection.username),
        password: dbConnection.decryptPassword(),
        connectionString: decrypt(dbConnection.connectionString)
    };

    return res.json({
        success: true,
        data: {
            connection: connectionConfig
        }
    });
});

const deleteDatabaseConnection = catchAsync(async (req, res) => {
    const { projectId, connectionId } = req.params;
    const { permanent = 'false' } = req.query;

    console.log(`[DB_DELETE] Project: ${projectId}, Connection: ${connectionId}, Permanent: ${permanent}`);

    const dbConnection = await DatabaseConnection.findOne({
        _id: connectionId,
        project: projectId
    });

    if (!dbConnection) {
        return res.status(404).json({
            success: false,
            message: 'Database connection not found',
            code: 'CONNECTION_NOT_FOUND'
        });
    }

    if (permanent === 'true') {
        await DatabaseConnection.deleteOne({ _id: connectionId });
        console.log(`[DB_DELETE_PERMANENT] Connection permanently deleted`);
    } else {
        await dbConnection.disconnect(req.user._id);
        console.log(`[DB_DELETE_SOFT] Connection soft deleted`);
    }

    const project = await Project.findById(projectId);
    if (project) {
        project.databaseConnections = project.databaseConnections.filter(
            id => id.toString() !== connectionId.toString()
        );
        await project.save();
    }

    return res.json({
        success: true,
        message: permanent === 'true' ? 'Database connection permanently deleted' : 'Database connection deleted successfully',
        data: {
            connectionId: connectionId,
            deleted: true
        }
    });
});

const setDefaultConnection = catchAsync(async (req, res) => {
    const { projectId, connectionId } = req.params;

    console.log(`[DB_SET_DEFAULT] Project: ${projectId}, Connection: ${connectionId}`);

    const dbConnection = await DatabaseConnection.findOne({
        _id: connectionId,
        project: projectId,
        isDeleted: false
    });

    if (!dbConnection) {
        return res.status(404).json({
            success: false,
            message: 'Database connection not found',
            code: 'CONNECTION_NOT_FOUND'
        });
    }

    await dbConnection.makeDefault();

    console.log(`[DB_SET_DEFAULT_SUCCESS] Default connection updated`);

    return res.json({
        success: true,
        message: 'Default database connection set successfully',
        data: {
            connectionId: connectionId,
            isDefault: true
        }
    });
});

module.exports = {
    createDatabaseConnection,
    testConnection,
    getDatabaseConnection,
    getDatabaseConnectionsByProject,
    updateDatabaseConnection,
    analyzeSchema,
    getConnectionForTesting,
    deleteDatabaseConnection,
    setDefaultConnection
};