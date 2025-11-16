const morgan = require('morgan');
const logger = require('../utils/logger.util');

morgan.token('user-id', (req) => {
    return req.user?._id?.toString() || 'anonymous';
});

morgan.token('request-id', (req) => {
    return req.id || 'N/A';
});

morgan.token('body', (req) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        const body = { ...req.body };
        if (body.password) body.password = '[REDACTED]';
        if (body.token) body.token = '[REDACTED]';
        if (body.accessToken) body.accessToken = '[REDACTED]';
        return JSON.stringify(body);
    }
    return '';
});

morgan.token('response-time-ms', (req, res) => {
    if (!req._startTime) return '0';
    const diff = process.hrtime(req._startTime);
    return (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
});

const developmentFormat = ':method :url :status :response-time ms - :res[content-length] - User: :user-id - ReqId: :request-id';

const productionFormat = JSON.stringify({
    method: ':method',
    url: ':url',
    status: ':status',
    contentLength: ':res[content-length]',
    responseTime: ':response-time-ms ms',
    userId: ':user-id',
    requestId: ':request-id',
    userAgent: ':user-agent',
    remoteAddr: ':remote-addr',
    timestamp: ':date[iso]'
});

const detailedFormat = JSON.stringify({
    method: ':method',
    url: ':url',
    status: ':status',
    contentLength: ':res[content-length]',
    responseTime: ':response-time-ms ms',
    userId: ':user-id',
    requestId: ':request-id',
    userAgent: ':user-agent',
    remoteAddr: ':remote-addr',
    referrer: ':referrer',
    body: ':body',
    timestamp: ':date[iso]'
});

const skip = (req, res) => {
    if (process.env.NODE_ENV === 'test') {
        return true;
    }

    if (req.url.includes('/health') || req.url.includes('/ping')) {
        return true;
    }

    return false;
};

const successHandler = morgan(
    process.env.NODE_ENV === 'development' ? developmentFormat : productionFormat,
    {
        skip: (req, res) => skip(req, res) || res.statusCode >= 400,
        stream: logger.stream
    }
);

const errorHandler = morgan(
    detailedFormat,
    {
        skip: (req, res) => skip(req, res) || res.statusCode < 400,
        stream: logger.stream
    }
);

const customLoggerMiddleware = (req, res, next) => {
    req._startTime = process.hrtime();

    const originalSend = res.send;
    res.send = function (data) {
        res.send = originalSend;

        const responseTime = process.hrtime(req._startTime);
        const responseTimeMs = (responseTime[0] * 1e3 + responseTime[1] * 1e-6).toFixed(2);

        const logData = {
            method: req.method,
            url: req.originalUrl || req.url,
            status: res.statusCode,
            responseTime: `${responseTimeMs}ms`,
            userId: req.user?._id?.toString() || 'anonymous',
            requestId: req.id,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            timestamp: new Date().toISOString()
        };

        if (res.statusCode >= 500) {
            logger.error('Server Error Response', logData);
        } else if (res.statusCode >= 400) {
            logger.warn('Client Error Response', logData);
        } else {
            logger.http('Success Response', logData);
        }

        return originalSend.call(this, data);
    };

    next();
};

const requestLogger = (req, res, next) => {
    const logData = {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        requestId: req.id,
        userId: req.user?._id?.toString() || 'anonymous',
        timestamp: new Date().toISOString()
    };

    if (req.method !== 'GET') {
        const body = { ...req.body };
        if (body.password) body.password = '[REDACTED]';
        if (body.token) body.token = '[REDACTED]';
        if (body.accessToken) body.accessToken = '[REDACTED]';
        if (body.refreshToken) body.refreshToken = '[REDACTED]';
        logData.body = body;
    }

    logger.http('Incoming Request', logData);
    next();
};

const responseLogger = (req, res, next) => {
    const originalJson = res.json;

    res.json = function (data) {
        const responseTime = req._startTime
            ? process.hrtime(req._startTime)
            : null;

        const responseTimeMs = responseTime
            ? (responseTime[0] * 1e3 + responseTime[1] * 1e-6).toFixed(2)
            : 'N/A';

        const logData = {
            method: req.method,
            url: req.originalUrl || req.url,
            status: res.statusCode,
            responseTime: `${responseTimeMs}ms`,
            userId: req.user?._id?.toString() || 'anonymous',
            requestId: req.id,
            timestamp: new Date().toISOString()
        };

        if (process.env.LOG_RESPONSE_BODY === 'true' && res.statusCode >= 400) {
            logData.responseBody = data;
        }

        logger.http('Outgoing Response', logData);

        return originalJson.call(this, data);
    };

    next();
};

const performanceLogger = (threshold = 3000) => {
    return (req, res, next) => {
        const start = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - start;

            if (duration > threshold) {
                logger.warn('Slow Request Detected', {
                    method: req.method,
                    url: req.originalUrl || req.url,
                    duration: `${duration}ms`,
                    threshold: `${threshold}ms`,
                    userId: req.user?._id?.toString(),
                    requestId: req.id,
                    timestamp: new Date().toISOString()
                });
            }
        });

        next();
    };
};

const apiCallLogger = (service) => {
    return (req, res, next) => {
        logger.info('External API Call Initiated', {
            service: service,
            method: req.method,
            url: req.originalUrl || req.url,
            userId: req.user?._id?.toString(),
            requestId: req.id,
            timestamp: new Date().toISOString()
        });
        next();
    };
};

const databaseQueryLogger = (req, res, next) => {
    const originalQuery = req.db?.query;

    if (originalQuery) {
        req.db.query = function (...args) {
            const start = Date.now();
            const result = originalQuery.apply(this, args);

            result.then(() => {
                const duration = Date.now() - start;
                logger.debug('Database Query', {
                    query: args[0],
                    duration: `${duration}ms`,
                    requestId: req.id,
                    timestamp: new Date().toISOString()
                });
            });

            return result;
        };
    }

    next();
};

const securityLogger = (req, res, next) => {
    const suspiciousPatterns = [
        /(\.\.|\/etc\/|\/bin\/)/i,
        /(union|select|insert|update|delete|drop)/i,
        /(<script|<iframe|javascript:)/i
    ];

    const checkSuspicious = (obj) => {
        const str = JSON.stringify(obj);
        return suspiciousPatterns.some(pattern => pattern.test(str));
    };

    if (checkSuspicious(req.body) || checkSuspicious(req.query) || checkSuspicious(req.params)) {
        logger.warn('Suspicious Request Detected', {
            method: req.method,
            url: req.originalUrl || req.url,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            body: req.body,
            query: req.query,
            params: req.params,
            requestId: req.id,
            timestamp: new Date().toISOString()
        });
    }

    next();
};

module.exports = {
    successHandler,
    errorHandler,
    customLoggerMiddleware,
    requestLogger,
    responseLogger,
    performanceLogger,
    apiCallLogger,
    databaseQueryLogger,
    securityLogger
};