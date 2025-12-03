require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./public/swagger.json');

console.log('[APP_INIT] Starting application initialization...');
console.log(`[APP_ENV] Environment: ${process.env.NODE_ENV || 'development'}`);

try {
    console.log('[CONFIGS] Loading configuration files...');
    const connectDB = require('./configs/db.config');
    const { logEnvironmentInfo } = require('./configs/environment.config');
    const { getIO, initializeSocket } = require('./configs/socket.config');
    require('./configs/passport.config'); // ← LOAD PASSPORT CONFIG
    console.log('[CONFIGS] Configuration files loaded successfully');

    logEnvironmentInfo();

    console.log('[APP_SETUP] Setting up Express app...');
    const app = express();

    // Middleware
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    app.use(express.static(path.join(__dirname, 'public')));
    app.use('/docs', express.static(path.join(__dirname, 'docs')));

    console.log('[MIDDLEWARE] Express JSON and URL-encoded middleware configured');

    // Session Middleware - ADD THIS BEFORE PASSPORT
    app.use(session({
        secret: process.env.SESSION_SECRET || 'your-session-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.COOKIE_SECURE === 'true', // Set to true in production with HTTPS
            httpOnly: process.env.COOKIE_HTTP_ONLY !== 'false',
            sameSite: process.env.COOKIE_SAME_SITE || 'lax',
            maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 86400000 // 24 hours
        }
    }));

    console.log('[MIDDLEWARE] Express-session middleware configured');

    // Passport Middleware - ADD AFTER SESSION
    app.use(passport.initialize());
    app.use(passport.session());

    console.log('[MIDDLEWARE] Passport middleware configured');

    // Logger middleware
    app.use((req, res, next) => {
        console.log(`[REQUEST] ${req.method} ${req.path} | IP: ${req.ip} | ContentType: ${req.get('content-type')}`);
        next();
    });

    // Basic Routes
    app.get('/', (req, res) => {
        console.log('[ROUTE] GET / - Root route accessed');
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.get('/health', (req, res) => {
        console.log('[HEALTH_CHECK] Health check endpoint accessed');
        res.sendFile(path.join(__dirname, 'public', 'health.html'));
    });

    app.get('/documentation', (req, res) => {
        console.log('[DOCUMENT_CHECK] Document endpoint accessed');
        res.sendFile(path.join(__dirname, 'public', 'document.html'));
    });

    // Health API
    app.get('/health-api', (req, res) => {
        console.log('[HEALTH_API] Health API endpoint accessed');
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        });
    });

    // Swagger UI
    app.use('/api-info', swaggerUi.serve);
    app.get('/api-info', swaggerUi.setup(swaggerDocument, {
        customCss: `
            body {
                background: linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%);
            }
            .swagger-ui {
                background: transparent;
            }
            .topbar {
                background: rgba(255, 255, 255, 0.05);
                border-bottom: 2px solid rgba(255, 255, 255, 0.1);
            }
            .swagger-ui .info .title {
                color: #ffffff;
                font-size: 28px;
            }
            .swagger-ui .info .description {
                color: #aaaaaa;
            }
            .swagger-ui .opblock {
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.02);
            }
            .swagger-ui .opblock.opblock-get { border-left: 4px solid #61affe; }
            .swagger-ui .opblock.opblock-post { border-left: 4px solid #49cc90; }
            .swagger-ui .opblock.opblock-put { border-left: 4px solid #fca130; }
            .swagger-ui .opblock.opblock-delete { border-left: 4px solid #f93e3e; }
            .swagger-ui .opblock-summary { color: #ffffff; }
            .swagger-ui table { background: rgba(255, 255, 255, 0.02); }
            .swagger-ui table thead tr th {
                color: #ffffff;
                border-bottom: 2px solid rgba(255, 255, 255, 0.1);
            }
            .swagger-ui table tbody tr td {
                color: #aaaaaa;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            .swagger-ui input,
            .swagger-ui select,
            .swagger-ui textarea {
                background: rgba(255, 255, 255, 0.05);
                color: #ffffff;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
        `,
        customSiteTitle: 'Fetch API Documentation'
    }));

    console.log('[ROUTES] Starting route loading...');

    // Register Routes
    try {
        console.log('[ROUTES] Loading user routes...');
        const userRoutes = require('./routes/user.route');
        app.use('/api/v1/auth', userRoutes);
    } catch (err) {
        console.error('[ROUTES_ERROR] user.route:', err.message);
    }

    try {
        console.log('[ROUTES] Loading team routes...');
        const teamRoutes = require('./routes/team.route');
        app.use(`${process.env.API_PREFIX || '/api/v1'}/teams`, teamRoutes);
    } catch (err) {
        console.error('[ROUTES_ERROR] team.route:', err.message);
    }

    try {
        console.log('[ROUTES] Loading upload routes...');
        const uploadRoutes = require('./routes/upload.route');
        app.use(`${process.env.API_PREFIX || '/api/v1'}/files`, uploadRoutes);
    } catch (err) {
        console.error('[ROUTES_ERROR] upload.route:', err.message);
    }

    console.log('[ROUTES] All routes registered');

    // 404 Handler
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

    // Error Handler
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

    // SERVER START FUNCTION
    const startServer = async () => {
        try {
            console.log('[DATABASE] Connecting to MongoDB...');
            const dbConnection = await connectDB();
            console.log('[DATABASE] Connected to MongoDB');
            console.log(`[DATABASE] Host: ${dbConnection.connection.host}/${dbConnection.connection.name}`);

            const PORT = parseInt(process.env.PORT, 10) || 5000;
            const HOST = process.env.HOST || 'localhost';

            const server = app.listen(PORT, HOST, () => {
                console.log('[SERVER] Running successfully');
                console.log(`[SERVER] URL: http://${HOST}:${PORT}`);
            });

            if (process.env.WS_ENABLED !== 'false') {
                console.log('[WEBSOCKET] Initializing WebSocket...');
                initializeSocket(server);
                console.log('[WEBSOCKET] Ready');
            }

            // SHUTDOWN HANDLERS
            const gracefulShutdown = async (signal) => {
                console.log(`[SIGNAL] ${signal} received -> shutting down`);
                server.close(async () => {
                    await mongoose.connection.close();
                    console.log('[SIGNAL] MongoDB connection closed');
                    process.exit(0);
                });
            };

            process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
            process.on('SIGINT', () => gracefulShutdown('SIGINT'));

            process.on('unhandledRejection', (reason, promise) => {
                console.error('[UNHANDLED_REJECTION]', reason);
            });

            process.on('uncaughtException', (err) => {
                console.error('[UNCAUGHT_EXCEPTION]', err);
                process.exit(1);
            });

        } catch (error) {
            console.error('[STARTUP_ERROR] Server failed to start');
            console.error(error);
            process.exit(1);
        }
    };

    console.log('[APP_INIT] Running startServer()');
    startServer();

} catch (initError) {
    console.error('[INIT_FATAL_ERROR] Initialization failed:', initError.message);
    console.error('[INIT_FATAL_ERROR] Stack:', initError.stack);
    process.exit(1);
}