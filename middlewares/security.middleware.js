const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const crypto = require('crypto');

const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
            imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net', 'data:'],
            connectSrc: ["'self'", 'https://api.github.com', 'https://api.openai.com', 'https://api.anthropic.com', 'wss:', 'ws:'],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
            blockAllMixedContent: process.env.NODE_ENV === 'production' ? [] : null
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
});

const mongoSanitizeMiddleware = mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.warn(`Potential NoSQL injection detected in ${key}`);
    }
});

const xssMiddleware = xss();

const hppMiddleware = hpp({
    whitelist: [
        'page',
        'limit',
        'sort',
        'fields',
        'search',
        'filter',
        'status',
        'type',
        'category',
        'priority',
        'tags',
        'startDate',
        'endDate'
    ]
});

const preventClickjacking = (req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    next();
};

const secureHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    res.removeHeader('X-Powered-By');
    next();
};

const csrfProtection = (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const token = req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf;
    const sessionToken = req.session?.csrfToken;

    if (!token || !sessionToken || token !== sessionToken) {
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token',
            error: 'FORBIDDEN'
        });
    }

    next();
};

const generateCsrfToken = (req, res, next) => {
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = req.session.csrfToken;
    next();
};

const preventBruteForce = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
    const attempts = new Map();

    return (req, res, next) => {
        const key = req.user?._id?.toString() || req.ip;
        const now = Date.now();
        const userAttempts = attempts.get(key) || { count: 0, resetTime: now + windowMs };

        if (now > userAttempts.resetTime) {
            attempts.set(key, { count: 1, resetTime: now + windowMs });
            return next();
        }

        if (userAttempts.count >= maxAttempts) {
            return res.status(429).json({
                success: false,
                message: 'Too many attempts. Please try again later.',
                retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000)
            });
        }

        userAttempts.count++;
        attempts.set(key, userAttempts);
        next();
    };
};

const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        if (typeof obj !== 'object' || obj === null) return obj;

        for (let key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = obj[key].trim();
                obj[key] = obj[key].replace(/[<>]/g, '');
            } else if (typeof obj[key] === 'object') {
                obj[key] = sanitize(obj[key]);
            }
        }
        return obj;
    };

    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    if (req.params) req.params = sanitize(req.params);

    next();
};

const validateContentType = (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.headers['content-type'];

        if (!contentType) {
            return res.status(400).json({
                success: false,
                message: 'Content-Type header is required',
                error: 'BAD_REQUEST'
            });
        }

        const allowedTypes = [
            'application/json',
            'multipart/form-data',
            'application/x-www-form-urlencoded'
        ];

        const isAllowed = allowedTypes.some(type => contentType.includes(type));

        if (!isAllowed) {
            return res.status(415).json({
                success: false,
                message: 'Unsupported Content-Type',
                error: 'UNSUPPORTED_MEDIA_TYPE'
            });
        }
    }

    next();
};

const preventOpenRedirect = (req, res, next) => {
    const redirect = req.query.redirect || req.body.redirect;

    if (redirect) {
        try {
            const url = new URL(redirect, `${req.protocol}://${req.get('host')}`);
            const allowedHosts = process.env.ALLOWED_REDIRECT_HOSTS?.split(',') || [req.get('host')];

            if (!allowedHosts.includes(url.host)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid redirect URL',
                    error: 'BAD_REQUEST'
                });
            }
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid redirect URL format',
                error: 'BAD_REQUEST'
            });
        }
    }

    next();
};

const preventMassAssignment = (allowedFields) => {
    return (req, res, next) => {
        if (req.body && typeof req.body === 'object') {
            const filteredBody = {};

            for (let field of allowedFields) {
                if (req.body.hasOwnProperty(field)) {
                    filteredBody[field] = req.body[field];
                }
            }

            req.body = filteredBody;
        }

        next();
    };
};

const validateFileUpload = (req, res, next) => {
    if (!req.file && !req.files) {
        return next();
    }

    const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/json',
        'text/plain',
        'application/zip',
        'application/x-zip-compressed'
    ];

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.json', '.txt', '.zip'];

    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];

    for (let file of files) {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: `File type ${file.mimetype} is not allowed`,
                error: 'BAD_REQUEST'
            });
        }

        const fileExt = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
        if (!allowedExtensions.includes(fileExt)) {
            return res.status(400).json({
                success: false,
                message: `File extension ${fileExt} is not allowed`,
                error: 'BAD_REQUEST'
            });
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return res.status(400).json({
                success: false,
                message: 'File size exceeds maximum allowed size of 10MB',
                error: 'BAD_REQUEST'
            });
        }
    }

    next();
};

const ipWhitelist = (whitelist) => {
    return (req, res, next) => {
        const clientIp = req.ip || req.connection.remoteAddress;

        if (whitelist.includes(clientIp)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Access denied from this IP address',
            error: 'FORBIDDEN'
        });
    };
};

const detectSuspiciousActivity = (req, res, next) => {
    const suspiciousPatterns = [
        /(\.\.|\/etc\/|\/bin\/|\.\.\/|\.\.\\)/i,
        /(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|eval)/i,
        /(<script|<iframe|<object|<embed|onerror|onload)/i
    ];

    const checkString = (str) => {
        return suspiciousPatterns.some(pattern => pattern.test(str));
    };

    const checkObject = (obj) => {
        for (let key in obj) {
            if (typeof obj[key] === 'string' && checkString(obj[key])) {
                return true;
            }
            if (typeof obj[key] === 'object' && checkObject(obj[key])) {
                return true;
            }
        }
        return false;
    };

    if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
        console.warn(`Suspicious activity detected from IP: ${req.ip}`);
        return res.status(403).json({
            success: false,
            message: 'Suspicious activity detected',
            error: 'FORBIDDEN'
        });
    }

    next();
};

const requestIdMiddleware = (req, res, next) => {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
};

const securityMiddleware = [
    helmetConfig,
    mongoSanitizeMiddleware,
    xssMiddleware,
    hppMiddleware,
    preventClickjacking,
    secureHeaders,
    sanitizeInput,
    validateContentType,
    preventOpenRedirect,
    detectSuspiciousActivity,
    requestIdMiddleware
];

module.exports = {
    securityMiddleware,
    helmetConfig,
    mongoSanitizeMiddleware,
    xssMiddleware,
    hppMiddleware,
    preventClickjacking,
    secureHeaders,
    csrfProtection,
    generateCsrfToken,
    preventBruteForce,
    sanitizeInput,
    validateContentType,
    preventOpenRedirect,
    preventMassAssignment,
    validateFileUpload,
    ipWhitelist,
    detectSuspiciousActivity,
    requestIdMiddleware
};