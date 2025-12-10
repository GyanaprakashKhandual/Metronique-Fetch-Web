const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

console.log('[APP_INIT] Starting application initialization...');
console.log(`[APP_ENV] Environment: ${process.env.NODE_ENV || 'development'}`);

try {
    console.log('[CONFIGS] Loading configuration files...');
    const connectDB = require('./configs/db.config');
    const { logEnvironmentInfo } = require('./configs/environment.config');
    const { initializeSocket } = require('./configs/socket.config');
    const app = require('./app');
    console.log('[CONFIGS] Configuration files loaded successfully');

    logEnvironmentInfo();

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