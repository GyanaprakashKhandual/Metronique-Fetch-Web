const cors = require('cors');

const whitelist = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5000'];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }

        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else if (process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
        'X-API-Key',
        'X-User-Id',
        'X-Team-Id',
        'X-Project-Id',
        'X-Session-Id',
        'X-Request-Id',
        'X-CSRF-Token',
        'Cache-Control',
        'Pragma'
    ],
    exposedHeaders: [
        'Content-Length',
        'Content-Type',
        'X-Total-Count',
        'X-Page-Number',
        'X-Page-Size',
        'X-Request-Id',
        'X-Response-Time',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'Authorization',
        'Set-Cookie'
    ],
    maxAge: 86400,
    optionsSuccessStatus: 200,
    preflightContinue: false
};

const corsMiddleware = cors(corsOptions);

const corsErrorHandler = (err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS policy: Access denied from this origin',
            error: 'FORBIDDEN',
            origin: req.headers.origin || 'unknown'
        });
    }
    next(err);
};

const dynamicCors = (req, res, next) => {
    const requestOrigin = req.headers.origin;

    const customCorsOptions = {
        ...corsOptions,
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }

            if (req.user?.role === 'super_admin') {
                return callback(null, true);
            }

            const isDevelopment = process.env.NODE_ENV === 'development';
            const isWhitelisted = whitelist.includes(origin);
            const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');

            if (isWhitelisted || (isDevelopment && isLocalhost)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    };

    cors(customCorsOptions)(req, res, next);
};

const apiCors = cors({
    ...corsOptions,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: [...corsOptions.allowedHeaders, 'X-API-Version']
});

const webhookCors = cors({
    origin: '*',
    methods: ['POST'],
    allowedHeaders: ['Content-Type', 'X-Webhook-Signature', 'X-GitHub-Event', 'X-Hub-Signature'],
    credentials: false
});

const publicCors = cors({
    origin: '*',
    methods: ['GET'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: false,
    maxAge: 3600
});

const strictCors = cors({
    ...corsOptions,
    origin: (origin, callback) => {
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
});

const socketCors = {
    origin: whitelist,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: corsOptions.allowedHeaders
};

const addSecurityHeaders = (req, res, next) => {
    const origin = req.headers.origin;

    if (origin && whitelist.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
};

const preflightHandler = (req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.status(204).end();
    }
    next();
};

const validateOrigin = (req, res, next) => {
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    if (!origin && !referer) {
        return next();
    }

    const requestOrigin = origin || new URL(referer).origin;

    if (process.env.NODE_ENV === 'production') {
        if (!whitelist.includes(requestOrigin)) {
            return res.status(403).json({
                success: false,
                message: 'Invalid origin',
                error: 'FORBIDDEN'
            });
        }
    }

    next();
};

const teamSpecificCors = (req, res, next) => {
    const teamId = req.headers['x-team-id'];

    if (teamId && req.user?.teamMemberships) {
        const isMember = req.user.teamMemberships.some(
            membership => membership.team.toString() === teamId
        );

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this team resource',
                error: 'FORBIDDEN'
            });
        }
    }

    next();
};

const projectSpecificCors = (req, res, next) => {
    const projectId = req.headers['x-project-id'];

    if (projectId && req.user) {
        next();
    } else {
        next();
    }
};

module.exports = {
    corsMiddleware,
    corsErrorHandler,
    dynamicCors,
    apiCors,
    webhookCors,
    publicCors,
    strictCors,
    socketCors,
    addSecurityHeaders,
    preflightHandler,
    validateOrigin,
    teamSpecificCors,
    projectSpecificCors,
    corsOptions
};