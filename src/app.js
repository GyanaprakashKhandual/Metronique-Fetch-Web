const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Load Passport Configuration
require('./configs/passport.config');

console.log('[APP_SETUP] Setting up Express app...');
const app = express();

// CORS Configuration
const corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
console.log('[MIDDLEWARE] CORS configured for http://localhost:3000');

// Cookie Parser Middleware
app.use(cookieParser());
console.log('[MIDDLEWARE] Cookie parser configured');

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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'pages', 'index.html'));
});

app.get('/health', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'pages', 'health.html'));
});

app.get('/documentation', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'pages', 'document.html'));
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
    app.use('/api/v1/team', teamRoutes);
} catch (err) {
    console.error('[ROUTES_ERROR] team.route:', err.message);
}

try {
    console.log('[ROUTES] Loading upload routes...');
    const uploadRoutes = require('./routes/upload.route');
    app.use('/api/v1/files', uploadRoutes);
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

module.exports = app;