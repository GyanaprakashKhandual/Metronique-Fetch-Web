const mongoose = require('mongoose');

const databaseConfig = {
    production: process.env.MONGODB_URI_PROD,
    staging: process.env.MONGODB_URI_STAGING,
    development: process.env.MONGODB_URI_DEV,
    options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
        minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE) || 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        retryReads: true,
        w: 'majority',
        readPreference: 'primaryPreferred',
        appName: process.env.APP_NAME || 'ImageFetch',
        monitorCommands: process.env.DEBUG_MONGO === 'true',
        autoIndex: process.env.NODE_ENV !== 'production',
        family: 4
    }
};

const getMongoURI = () => {
    const env = process.env.NODE_ENV || 'development';
    const uri = databaseConfig[env];

    if (!uri) {
        console.error(`MongoDB URI Missing for Environment: ${env}`);
        console.error('Available Environments:', Object.keys(databaseConfig).filter(k => k !== 'options'));
        process.exit(1);
    }

    return uri;
};

const connectDB = async () => {
    try {
        const mongoURI = getMongoURI();
        const env = process.env.NODE_ENV || 'development';

        console.log(`Connecting to MongoDB (${env})...`);

        const connection = await mongoose.connect(mongoURI, databaseConfig.options);

        console.log('MongoDB Connected Successfully');
        console.log(`Host: ${connection.connection.host}`);
        console.log(`Database: ${connection.connection.name}`);
        console.log(`Environment: ${env}`);
        console.log(`Pool Size: ${databaseConfig.options.maxPoolSize}`);

        mongoose.connection.on('connected', () => {
            console.log('Mongoose Connection Established');
        });

        mongoose.connection.on('error', (err) => {
            console.error('Mongoose Connection Error:', err.message);
            if (process.env.NODE_ENV === 'production') {
                console.error('Critical Database Error - Monitoring Required');
            }
        });

        mongoose.connection.on('disconnected', () => {
            console.log('Mongoose Disconnected from MongoDB');
            if (process.env.NODE_ENV === 'production') {
                console.error('Production Database Disconnected - Immediate Action Required');
            }
        });

        mongoose.connection.on('reconnected', () => {
            console.log('Mongoose Reconnected to MongoDB');
        });

        process.on('SIGINT', async () => {
            console.log('SIGINT Signal Received - Closing MongoDB Connection');
            await mongoose.connection.close();
            console.log('MongoDB Connection Closed - Application Terminated');
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('SIGTERM Signal Received - Closing MongoDB Connection');
            await mongoose.connection.close();
            console.log('MongoDB Connection Closed - Application Terminated');
            process.exit(0);
        });

        process.on('unhandledRejection', (err) => {
            console.error('Unhandled Promise Rejection:', err.message);
            console.error('Stack:', err.stack);
        });

        if (process.env.NODE_ENV !== 'production') {
            await createIndexes();
        }

        return connection;
    } catch (error) {
        console.error('MongoDB Connection Failed:', error.message);
        console.error('Error Code:', error.code);
        console.error('Stack:', error.stack);

        if (error.name === 'MongoServerSelectionError') {
            console.error('Server Selection Failed - Check Network/Firewall Settings');
        } else if (error.name === 'MongoAuthenticationError') {
            console.error('Authentication Failed - Check Credentials');
        } else if (error.name === 'MongoParseError') {
            console.error('URI Parse Error - Check Connection String Format');
        }

        process.exit(1);
    }
};

const createIndexes = async () => {
    try {
        console.log('Creating Database Indexes...');
        const db = mongoose.connection.db;

        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        if (collectionNames.includes('users')) {
            await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
            await db.collection('users').createIndex({ 'workspaces.workspace': 1 });
            await db.collection('users').createIndex({ 'subscription.status': 1 });
            await db.collection('users').createIndex({ role: 1 });
            await db.collection('users').createIndex({ isActive: 1, isDeleted: 1 });
            await db.collection('users').createIndex({ createdAt: -1 });
            console.log('Users Indexes Created');
        }

        if (collectionNames.includes('teams')) {
            await db.collection('teams').createIndex({ slug: 1 }, { unique: true });
            await db.collection('teams').createIndex({ owner: 1 });
            await db.collection('teams').createIndex({ isActive: 1, isDeleted: 1 });
            console.log('Teams Indexes Created');
        }

        if (collectionNames.includes('projects')) {
            await db.collection('projects').createIndex({ owner: 1 });
            await db.collection('projects').createIndex({ team: 1 });
            await db.collection('projects').createIndex({ slug: 1 });
            await db.collection('projects').createIndex({ status: 1 });
            await db.collection('projects').createIndex({ 'repository.fullName': 1 });
            await db.collection('projects').createIndex({ owner: 1, status: 1 });
            await db.collection('projects').createIndex({ team: 1, status: 1 });
            console.log('Projects Indexes Created');
        }

        if (collectionNames.includes('testscripts')) {
            await db.collection('testscripts').createIndex({ project: 1 });
            await db.collection('testscripts').createIndex({ owner: 1 });
            await db.collection('testscripts').createIndex({ status: 1 });
            await db.collection('testscripts').createIndex({ createdAt: -1 });
            console.log('TestScripts Indexes Created');
        }

        if (collectionNames.includes('testexecutions')) {
            await db.collection('testexecutions').createIndex({ project: 1, createdAt: -1 });
            await db.collection('testexecutions').createIndex({ status: 1 });
            await db.collection('testexecutions').createIndex({ executedBy: 1 });
            console.log('TestExecutions Indexes Created');
        }

        if (collectionNames.includes('apiendpoints')) {
            await db.collection('apiendpoints').createIndex({ project: 1 });
            await db.collection('apiendpoints').createIndex({ method: 1, path: 1 });
            console.log('ApiEndpoints Indexes Created');
        }

        if (collectionNames.includes('invitations')) {
            await db.collection('invitations').createIndex({ team: 1, email: 1 });
            await db.collection('invitations').createIndex({ token: 1 });
            await db.collection('invitations').createIndex({ status: 1 });
            await db.collection('invitations').createIndex({ expiresAt: 1 });
            console.log('Invitations Indexes Created');
        }

        if (collectionNames.includes('projectaccesses')) {
            await db.collection('projectaccesses').createIndex({ project: 1, user: 1 }, { unique: true });
            await db.collection('projectaccesses').createIndex({ user: 1 });
            await db.collection('projectaccesses').createIndex({ project: 1, status: 1 });
            console.log('ProjectAccesses Indexes Created');
        }

        if (collectionNames.includes('teammembers')) {
            await db.collection('teammembers').createIndex({ team: 1, user: 1 }, { unique: true });
            await db.collection('teammembers').createIndex({ user: 1 });
            await db.collection('teammembers').createIndex({ team: 1, role: 1 });
            console.log('TeamMembers Indexes Created');
        }

        if (collectionNames.includes('notifications')) {
            await db.collection('notifications').createIndex({ recipient: 1, isRead: 1, createdAt: -1 });
            await db.collection('notifications').createIndex({ createdAt: -1 });
            console.log('Notifications Indexes Created');
        }

        if (collectionNames.includes('activitylogs')) {
            await db.collection('activitylogs').createIndex({ user: 1, createdAt: -1 });
            await db.collection('activitylogs').createIndex({ project: 1, createdAt: -1 });
            await db.collection('activitylogs').createIndex({ team: 1, createdAt: -1 });
            console.log('ActivityLogs Indexes Created');
        }

        console.log('All Database Indexes Created Successfully');
    } catch (error) {
        console.error('Index Creation Error:', error.message);
        console.error('Index creation failed but application will continue');
    }
};

const checkDBHealth = async () => {
    try {
        const state = mongoose.connection.readyState;

        if (state !== 1) {
            return {
                status: 'unhealthy',
                connected: false,
                state: ['disconnected', 'connected', 'connecting', 'disconnecting'][state],
                message: 'Database not connected'
            };
        }

        const admin = mongoose.connection.db.admin();
        const startTime = Date.now();
        await admin.ping();
        const responseTime = Date.now() - startTime;

        const stats = await mongoose.connection.db.stats();

        return {
            status: 'healthy',
            connected: true,
            responseTime: `${responseTime}ms`,
            database: mongoose.connection.name,
            collections: stats.collections,
            dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
            indexes: stats.indexes,
            avgObjSize: `${(stats.avgObjSize / 1024).toFixed(2)} KB`
        };
    } catch (error) {
        console.error('Health Check Failed:', error.message);
        return {
            status: 'unhealthy',
            connected: false,
            error: error.message
        };
    }
};

const getConnectionStats = () => {
    const connection = mongoose.connection;
    const state = connection.readyState;

    return {
        state: ['disconnected', 'connected', 'connecting', 'disconnecting'][state],
        name: connection.name,
        host: connection.host,
        port: connection.port,
        models: connection.modelNames().length,
        collections: Object.keys(connection.collections).length,
        readyState: state,
        poolSize: databaseConfig.options.maxPoolSize
    };
};

const getPoolStats = () => {
    try {
        const connection = mongoose.connection;

        return {
            maxPoolSize: databaseConfig.options.maxPoolSize,
            minPoolSize: databaseConfig.options.minPoolSize,
            currentConnections: connection.client ? connection.client.topology?.s?.pool?.totalConnectionCount : 0,
            availableConnections: connection.client ? connection.client.topology?.s?.pool?.availableConnectionCount : 0
        };
    } catch (error) {
        console.error('Pool Stats Error:', error.message);
        return null;
    }
};

const disconnectDB = async () => {
    try {
        console.log('Disconnecting from MongoDB...');
        await mongoose.disconnect();
        console.log('MongoDB Disconnected Successfully');
    } catch (error) {
        console.error('MongoDB Disconnect Error:', error.message);
        throw error;
    }
};

const reconnectDB = async () => {
    try {
        console.log('Attempting to Reconnect to MongoDB...');
        await mongoose.connection.close();
        await connectDB();
        console.log('MongoDB Reconnected Successfully');
    } catch (error) {
        console.error('MongoDB Reconnect Error:', error.message);
        throw error;
    }
};

module.exports = connectDB;
module.exports.checkDBHealth = checkDBHealth;
module.exports.getConnectionStats = getConnectionStats;
module.exports.getPoolStats = getPoolStats;
module.exports.disconnectDB = disconnectDB;
module.exports.reconnectDB = reconnectDB;
module.exports.databaseConfig = databaseConfig;