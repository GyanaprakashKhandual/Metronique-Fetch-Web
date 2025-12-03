const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const { Client: PostgresClient } = require('pg');
const DatabaseConnection = require('../models/database.connection.model');
const AuditLog = require('../models/audit.model');

class ConnectionService {
    constructor() {
        this.connections = new Map();
        this.connectionPool = new Map();
    }

    async createConnection(dbConnectionId, userId, metadata = {}) {
        console.log(`[ConnectionService] Creating database connection: ${dbConnectionId}`);

        try {
            const dbConnection = await DatabaseConnection.findById(dbConnectionId);

            if (!dbConnection) {
                throw new Error('Database connection not found');
            }

            if (this.connections.has(dbConnectionId)) {
                console.log(`[ConnectionService] Connection already exists: ${dbConnectionId}`);
                return this.connections.get(dbConnectionId);
            }

            let connection;

            switch (dbConnection.type) {
                case 'mongodb':
                    connection = await this.createMongoDBConnection(dbConnection);
                    break;
                case 'mysql':
                case 'mariadb':
                    connection = await this.createMySQLConnection(dbConnection);
                    break;
                case 'postgresql':
                    connection = await this.createPostgresConnection(dbConnection);
                    break;
                default:
                    throw new Error(`Unsupported database type: ${dbConnection.type}`);
            }

            this.connections.set(dbConnectionId, connection);
            dbConnection.isConnected = true;
            dbConnection.status = 'active';
            dbConnection.lastConnectionTest = new Date();
            dbConnection.lastConnectionStatus = 'success';

            await dbConnection.save();

            await AuditLog.create({
                user: userId,
                action: 'database_connected',
                actionCategory: 'project',
                entityType: 'database',
                entityId: dbConnectionId,
                entityName: dbConnection.name,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Database connection established`,
                    dbType: dbConnection.type,
                    environment: dbConnection.environment
                },
                ...metadata
            });

            console.log(`[ConnectionService] Database connection established: ${dbConnectionId} (${dbConnection.type})`);
            return connection;
        } catch (error) {
            console.error(`[ConnectionService] Error creating connection:`, error.message);

            const dbConnection = await DatabaseConnection.findById(dbConnectionId);
            if (dbConnection) {
                dbConnection.isConnected = false;
                dbConnection.status = 'error';
                dbConnection.lastConnectionStatus = 'failed';
                dbConnection.lastConnectionError = error.message;
                await dbConnection.save();
            }

            throw error;
        }
    }

    async createMongoDBConnection(dbConnection) {
        console.log(`[ConnectionService] Creating MongoDB connection to ${dbConnection.connection.host}`);

        try {
            const password = dbConnection.decryptPassword();
            const connectionString = `mongodb://${dbConnection.connection.username}:${encodeURIComponent(password)}@${dbConnection.connection.host}:${dbConnection.connection.port}/${dbConnection.connection.database}`;

            const client = new mongoose.mongo.MongoClient(connectionString, {
                maxPoolSize: dbConnection.options.maxPoolSize,
                minPoolSize: dbConnection.options.minPoolSize,
                connectTimeoutMS: dbConnection.options.connectTimeout,
                socketTimeoutMS: dbConnection.options.socketTimeout,
                serverSelectionTimeoutMS: 10000
            });

            await client.connect();
            console.log(`[ConnectionService] MongoDB connection successful`);

            return {
                type: 'mongodb',
                client: client,
                db: client.db(dbConnection.connection.database),
                connectionId: dbConnection._id
            };
        } catch (error) {
            console.error(`[ConnectionService] MongoDB connection failed:`, error.message);
            throw error;
        }
    }

    async createMySQLConnection(dbConnection) {
        console.log(`[ConnectionService] Creating MySQL connection to ${dbConnection.connection.host}`);

        try {
            const password = dbConnection.decryptPassword();

            const pool = await mysql.createPool({
                host: dbConnection.connection.host,
                port: dbConnection.connection.port,
                user: dbConnection.connection.username,
                password: password,
                database: dbConnection.connection.database,
                waitForConnections: true,
                connectionLimit: dbConnection.options.maxPoolSize,
                queueLimit: 0,
                enableKeepAlive: dbConnection.options.keepAlive,
                keepAliveInitialDelayMs: 30000
            });

            const connection = await pool.getConnection();
            await connection.ping();
            connection.release();

            console.log(`[ConnectionService] MySQL connection successful`);

            return {
                type: 'mysql',
                pool: pool,
                connectionId: dbConnection._id
            };
        } catch (error) {
            console.error(`[ConnectionService] MySQL connection failed:`, error.message);
            throw error;
        }
    }

    async createPostgresConnection(dbConnection) {
        console.log(`[ConnectionService] Creating PostgreSQL connection to ${dbConnection.connection.host}`);

        try {
            const password = dbConnection.decryptPassword();

            const client = new PostgresClient({
                host: dbConnection.connection.host,
                port: dbConnection.connection.port,
                user: dbConnection.connection.username,
                password: password,
                database: dbConnection.connection.database,
                max: dbConnection.options.maxPoolSize,
                min: dbConnection.options.minPoolSize,
                connectionTimeoutMillis: dbConnection.options.connectTimeout,
                idleTimeoutMillis: dbConnection.options.socketTimeout,
                application_name: 'metronique-fetch'
            });

            await client.connect();
            await client.query('SELECT NOW()');
            console.log(`[ConnectionService] PostgreSQL connection successful`);

            return {
                type: 'postgresql',
                client: client,
                connectionId: dbConnection._id
            };
        } catch (error) {
            console.error(`[ConnectionService] PostgreSQL connection failed:`, error.message);
            throw error;
        }
    }

    async getConnection(dbConnectionId) {
        console.log(`[ConnectionService] Retrieving connection: ${dbConnectionId}`);

        try {
            if (!this.connections.has(dbConnectionId)) {
                throw new Error(`Connection not found: ${dbConnectionId}`);
            }

            const connection = this.connections.get(dbConnectionId);
            console.log(`[ConnectionService] Connection retrieved: ${dbConnectionId}`);

            return connection;
        } catch (error) {
            console.error(`[ConnectionService] Error retrieving connection:`, error.message);
            throw error;
        }
    }

    async closeConnection(dbConnectionId, userId, metadata = {}) {
        console.log(`[ConnectionService] Closing database connection: ${dbConnectionId}`);

        try {
            const connection = this.connections.get(dbConnectionId);

            if (!connection) {
                throw new Error('Connection not found');
            }

            if (connection.type === 'mongodb') {
                await connection.client.close();
            } else if (connection.type === 'mysql') {
                await connection.pool.end();
            } else if (connection.type === 'postgresql') {
                await connection.client.end();
            }

            this.connections.delete(dbConnectionId);

            const dbConnection = await DatabaseConnection.findById(dbConnectionId);
            if (dbConnection) {
                dbConnection.isConnected = false;
                dbConnection.status = 'inactive';
                await dbConnection.save();
            }

            await AuditLog.create({
                user: userId,
                action: 'database_disconnected',
                actionCategory: 'project',
                entityType: 'database',
                entityId: dbConnectionId,
                status: 'success',
                severity: 'info',
                details: { description: `Database connection closed` },
                ...metadata
            });

            console.log(`[ConnectionService] Database connection closed: ${dbConnectionId}`);
            return { success: true, message: 'Connection closed successfully' };
        } catch (error) {
            console.error(`[ConnectionService] Error closing connection:`, error.message);
            throw error;
        }
    }

    async testConnection(dbConnectionId) {
        console.log(`[ConnectionService] Testing database connection: ${dbConnectionId}`);

        try {
            const dbConnection = await DatabaseConnection.findById(dbConnectionId);

            if (!dbConnection) {
                throw new Error('Database connection not found');
            }

            const startTime = Date.now();
            let connection;

            try {
                connection = await this.createConnection(dbConnectionId, null);
            } catch (error) {
                dbConnection.lastConnectionTest = new Date();
                dbConnection.lastConnectionStatus = 'failed';
                dbConnection.lastConnectionError = error.message;
                dbConnection.isConnected = false;
                dbConnection.status = 'error';
                await dbConnection.save();

                throw error;
            }

            const responseTime = Date.now() - startTime;

            dbConnection.lastConnectionTest = new Date();
            dbConnection.lastConnectionStatus = 'success';
            dbConnection.isConnected = true;
            dbConnection.status = 'active';
            dbConnection.lastConnectionError = undefined;

            if (dbConnection.testHistory.length >= 100) {
                dbConnection.testHistory = dbConnection.testHistory.slice(-99);
            }

            dbConnection.testHistory.push({
                testedAt: new Date(),
                status: 'success',
                responseTime: responseTime
            });

            await dbConnection.save();

            console.log(`[ConnectionService] Connection test successful: ${responseTime}ms`);
            return { success: true, responseTime, message: 'Connection test successful' };
        } catch (error) {
            console.error(`[ConnectionService] Error testing connection:`, error.message);
            throw error;
        }
    }

    async closeAllConnections() {
        console.log(`[ConnectionService] Closing all ${this.connections.size} active connections`);

        try {
            for (const [connectionId, connection] of this.connections) {
                try {
                    if (connection.type === 'mongodb') {
                        await connection.client.close();
                    } else if (connection.type === 'mysql') {
                        await connection.pool.end();
                    } else if (connection.type === 'postgresql') {
                        await connection.client.end();
                    }
                } catch (error) {
                    console.warn(`[ConnectionService] Error closing connection ${connectionId}:`, error.message);
                }
            }

            this.connections.clear();
            console.log(`[ConnectionService] All connections closed`);
            return { success: true, closedCount: this.connections.size };
        } catch (error) {
            console.error(`[ConnectionService] Error closing all connections:`, error.message);
            throw error;
        }
    }

    getConnectionStatus(dbConnectionId) {
        console.log(`[ConnectionService] Checking connection status: ${dbConnectionId}`);

        const isActive = this.connections.has(dbConnectionId);
        console.log(`[ConnectionService] Connection status: ${isActive ? 'active' : 'inactive'}`);

        return {
            connectionId: dbConnectionId,
            isActive: isActive,
            status: isActive ? 'connected' : 'disconnected'
        };
    }

    getAllActiveConnections() {
        console.log(`[ConnectionService] Retrieving all active connections`);

        const connections = [];
        for (const [connectionId, connection] of this.connections) {
            connections.push({
                connectionId: connectionId,
                type: connection.type,
                status: 'active'
            });
        }

        console.log(`[ConnectionService] Found ${connections.length} active connections`);
        return connections;
    }
}

module.exports = new ConnectionService();