const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

require('./configs/passport.config');

console.log('[APP_SETUP] Setting up Express app...');
const app = express();

const corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
console.log('[MIDDLEWARE] CORS configured for http://localhost:3000');

app.use(cookieParser());
console.log('[MIDDLEWARE] Cookie parser configured');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/docs', express.static(path.join(__dirname, 'docs')));

console.log('[MIDDLEWARE] Express JSON and URL-encoded middleware configured');

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.COOKIE_SECURE === 'true',
        httpOnly: process.env.COOKIE_HTTP_ONLY !== 'false',
        sameSite: process.env.COOKIE_SAME_SITE || 'lax',
        maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 86400000
    }
}));

console.log('[MIDDLEWARE] Express-session middleware configured');

app.use(passport.initialize());
app.use(passport.session());

console.log('[MIDDLEWARE] Passport middleware configured');

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

try {
    console.log('[ROUTES] Loading user routes...');
    const userRoutes = require('./routes/user.route');
    app.use('/api/v1/auth', userRoutes);
    console.log('[ROUTES] User routes loaded successfully');
} catch (err) {
    console.error('[ROUTES_ERROR] user.route:', err.message);
}

try {
    console.log('[ROUTES] Loading team routes...');
    const teamRoutes = require('./routes/team.route');
    app.use('/api/v1/team', teamRoutes);
    console.log('[ROUTES] Team routes loaded successfully');
} catch (err) {
    console.error('[ROUTES_ERROR] team.route:', err.message);
}

try {
    console.log('[ROUTES] Loading upload routes...');
    const uploadRoutes = require('./routes/upload.route');
    app.use('/api/v1/files', uploadRoutes);
    console.log('[ROUTES] Upload routes loaded successfully');
} catch (err) {
    console.error('[ROUTES_ERROR] upload.route:', err.message);
}

try {
    console.log('[ROUTES] Loading project routes...');
    const projectRoutes = require('./routes/project.route');
    app.use('/api/v1/projects', projectRoutes);
    console.log('[ROUTES] Project routes loaded successfully');
} catch (err) {
    console.error('[ROUTES_ERROR] project.route:', err.message);
    console.error('[ROUTES_ERROR] Stack:', err.stack);
}

try {
    console.log('[ROUTES] Loading repository routes...');
    const repositoryRoutes = require('./routes/repository.route');
    app.use('/api/v1/projects', repositoryRoutes);
    console.log('[ROUTES] Repository routes loaded successfully');
} catch (err) {
    console.error('[ROUTES_ERROR] repository.route:', err.message);
}

try {
    console.log('[ROUTES] Loading database routes...');
    const databaseRoutes = require('./routes/database.route');
    app.use('/api/v1/projects', databaseRoutes);
    console.log('[ROUTES] Database routes loaded successfully');
} catch (err) {
    console.error('[ROUTES_ERROR] database.route:', err.message);
}

try {
    console.log('[ROUTES] Loading AI analysis routes...');
    const aiAnalysisRoutes = require('./routes/ai.analysis.route');
    app.use('/api/v1/projects', aiAnalysisRoutes);
    console.log('[ROUTES] AI analysis routes loaded successfully');
} catch (err) {
    console.error('[ROUTES_ERROR] ai.analysis.route:', err.message);
}

try {
    console.log('[ROUTES] Loading test script routes...');
    const testScriptRoutes = require('./routes/test.script.route');
    app.use('/api/v1/projects', testScriptRoutes);
    console.log('[ROUTES] Test script routes loaded successfully');
} catch (err) {
    console.error('[ROUTES_ERROR] test.script.route:', err.message);
}

try {
    console.log('[ROUTES] Loading test folder routes...');
    const testFolderRoutes = require('./routes/test.folder.route');
    app.use('/api/v1/projects', testFolderRoutes);
    console.log('[ROUTES] Test folder routes loaded successfully');
} catch (err) {
    console.error('[ROUTES_ERROR] test.folder.route:', err.message);
}

try {
    console.log('[ROUTES] Loading test file routes...');
    const testFileRoutes = require('./routes/test.file.route');
    app.use('/api/v1/projects', testFileRoutes);
    console.log('[ROUTES] Test file routes loaded successfully');
} catch (err) {
    console.error('[ROUTES_ERROR] test.file.route:', err.message);
}

try {
    console.log('[ROUTES] Loading test execution routes...');
    const testExecutionRoutes = require('./routes/test.execution.route');
    app.use('/api/v1/projects', testExecutionRoutes);
    console.log('[ROUTES] Test execution routes loaded successfully');
} catch (err) {
    console.error('[ROUTES_ERROR] test.execution.route:', err.message);
}

console.log('[ROUTES] All routes registered');

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

module.exports = app;