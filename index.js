require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

console.log('[APP_INIT] Starting application initialization...');
console.log(`[APP_ENV] Environment: ${process.env.NODE_ENV || 'development'}`);

try {
    console.log('[CONFIGS] Loading configuration files...');
    const connectDB = require('./configs/db.config');
    const { logEnvironmentInfo } = require('./configs/environment.config');
    const { getIO, initializeSocket } = require('./configs/socket.config');
    console.log('[CONFIGS] Configuration files loaded successfully');

    logEnvironmentInfo();

    console.log('[APP_SETUP] Setting up Express app...');
    const app = express();

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    console.log('[MIDDLEWARE] Express JSON and URL-encoded middleware configured');

    app.use((req, res, next) => {
        console.log(`[REQUEST] ${req.method} ${req.path} | IP: ${req.ip} | ContentType: ${req.get('content-type')}`);
        next();
    });

    app.get('/', (req, res) => {
        console.log('[ROUTE] GET / - Root route accessed');
        res.json({
            message: 'Welcome to the API',
            app: process.env.APP_NAME || 'Fetch',
            version: process.env.API_VERSION || 'v1',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        });
    });

    app.get('/health', (req, res) => {
        console.log('[HEALTH_CHECK] Health check endpoint accessed');
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        });
    });

    app.get('/api-info', (req, res) => {
        console.log('[API_INFO] API information endpoint accessed');
        res.json({
            app: process.env.APP_NAME || 'Fetch',
            version: process.env.API_VERSION || 'v1',
            host: process.env.HOST || 'localhost',
            port: process.env.PORT || 5000,
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        });
    });

    console.log('[ROUTES] Starting route loading...');

    try {
        console.log('[ROUTES] Loading user routes...');
        const userRoutes = require('./routes/user.route');
        app.use(`${process.env.API_PREFIX || '/api/v1'}/users`, userRoutes);
        console.log('[ROUTES] User routes registered successfully');
    } catch (err) {
        console.error('[ROUTES_ERROR] Failed to load user routes:', err.message);
        console.error('[ROUTES_ERROR] Stack:', err.stack);
    }

    try {
        console.log('[ROUTES] Loading team routes...');
        const teamRoutes = require('./routes/team.route');
        app.use(`${process.env.API_PREFIX || '/api/v1'}/teams`, teamRoutes);
        console.log('[ROUTES] Team routes registered successfully');
    } catch (err) {
        console.error('[ROUTES_ERROR] Failed to load team routes:', err.message);
        console.error('[ROUTES_ERROR] Stack:', err.stack);
    }

    try {
        console.log('[ROUTES] Loading upload routes...');
        const uploadRoutes = require('./routes/upload.route');
        app.use(`${process.env.API_PREFIX || '/api/v1'}/files`, uploadRoutes);
        console.log('[ROUTES] Upload routes registered successfully');
    } catch (err) {
        console.error('[ROUTES_ERROR] Failed to load upload routes:', err.message);
        console.error('[ROUTES_ERROR] Stack:', err.stack);
    }

    console.log('[ROUTES] All available routes registered');

    app.use((req, res, next) => {
        console.warn(`[ROUTE_NOT_FOUND] ${req.method} ${req.path}`);
        res.status(404).json({
            success: false,
            message: 'Route not found',
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
        });
    });

    app.use((err, req, res, next) => {
        console.error(`[ERROR] ${err.message}`);
        console.error(`[ERROR_STACK] ${err.stack}`);
        res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Internal Server Error',
            error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
            timestamp: new Date().toISOString()
        });
    });

    const startServer = async () => {
        try {
            console.log('[DATABASE] Initiating MongoDB connection...');
            const dbConnection = await connectDB();
            console.log('[DATABASE] MongoDB connection established successfully');
            console.log(`[DATABASE] Connected to: ${dbConnection.connection.host}/${dbConnection.connection.name}`);

            const PORT = parseInt(process.env.PORT, 10) || 5000;
            const HOST = process.env.HOST || 'localhost';

            const server = app.listen(PORT, HOST, () => {
                console.log('[SERVER] Server initialization complete');
                console.log(`[SERVER] Listening on: http://${HOST}:${PORT}`);
                console.log(`[SERVER] API Version: ${process.env.API_VERSION || 'v1'}`);
                console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
            });

            if (process.env.WS_ENABLED !== 'false') {
                console.log('[WEBSOCKET] Initializing WebSocket server...');
                initializeSocket(server);
                console.log('[WEBSOCKET] WebSocket server initialized successfully');
                console.log(`[WEBSOCKET] Port: ${process.env.WS_PORT || 3001}`);
            }

            process.on('SIGTERM', async () => {
                console.log('[SIGNAL] SIGTERM signal received: closing HTTP server');
                server.close(async () => {
                    console.log('[SIGNAL] HTTP server closed');
                    try {
                        const mongoose = require('mongoose');
                        await mongoose.connection.close();
                        console.log('[SIGNAL] MongoDB connection closed');
                        process.exit(0);
                    } catch (err) {
                        console.error('[SIGNAL] Error closing MongoDB connection:', err.message);
                        process.exit(1);
                    }
                });
            });

            process.on('SIGINT', async () => {
                console.log('[SIGNAL] SIGINT signal received: closing HTTP server');
                server.close(async () => {
                    console.log('[SIGNAL] HTTP server closed');
                    try {
                        const mongoose = require('mongoose');
                        await mongoose.connection.close();
                        console.log('[SIGNAL] MongoDB connection closed');
                        process.exit(0);
                    } catch (err) {
                        console.error('[SIGNAL] Error closing MongoDB connection:', err.message);
                        process.exit(1);
                    }
                });
            });

            process.on('unhandledRejection', (reason, promise) => {
                console.error('[UNHANDLED_REJECTION] Promise rejected:', reason);
                console.error('[UNHANDLED_REJECTION] Promise:', promise);
            });

            process.on('uncaughtException', (err) => {
                console.error('[UNCAUGHT_EXCEPTION] Exception thrown:', err.message);
                console.error('[UNCAUGHT_EXCEPTION] Stack:', err.stack);
                process.exit(1);
            });

        } catch (error) {
            console.error('[STARTUP_ERROR] Failed to start server');
            console.error('[STARTUP_ERROR] Error:', error.message);
            console.error('[STARTUP_ERROR] Stack:', error.stack);
            process.exit(1);
        }
    };

    console.log('[APP_INIT] Application initialization sequence started');
    startServer();

} catch (initError) {
    console.error('[INIT_FATAL_ERROR] Fatal initialization error:', initError.message);
    console.error('[INIT_FATAL_ERROR] Stack:', initError.stack);
    process.exit(1);
}