const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

const logDir = process.env.LOG_FILE_PATH || path.join(__dirname, '../../logs');

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
};

winston.addColors(colors);

const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        let msg = `${timestamp} [${level}]: ${message}`;

        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta, null, 2)}`;
        }

        return msg;
    })
);

const fileRotateTransport = new DailyRotateFile({
    filename: path.join(logDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: customFormat
});

const errorFileRotateTransport = new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: customFormat
});

const combinedFileRotateTransport = new DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: customFormat
});

const httpFileRotateTransport = new DailyRotateFile({
    filename: path.join(logDir, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    level: 'http',
    format: customFormat
});

const transports = [
    fileRotateTransport,
    errorFileRotateTransport,
    combinedFileRotateTransport,
    httpFileRotateTransport
];

if (process.env.NODE_ENV !== 'production') {
    transports.push(
        new winston.transports.Console({
            format: consoleFormat,
            level: 'debug'
        })
    );
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels: winston.config.npm.levels,
    format: customFormat,
    defaultMeta: {
        service: 'imagefetch-api',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: transports,
    exceptionHandlers: [
        new DailyRotateFile({
            filename: path.join(logDir, 'exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d'
        })
    ],
    rejectionHandlers: [
        new DailyRotateFile({
            filename: path.join(logDir, 'rejections-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d'
        })
    ],
    exitOnError: false
});

const stream = {
    write: (message) => {
        logger.http(message.trim());
    }
};

const logRequest = (req, level = 'info') => {
    logger.log(level, 'Incoming Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user?._id,
        requestId: req.id
    });
};

const logResponse = (req, res, responseTime) => {
    logger.http('Outgoing Response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        userId: req.user?._id,
        requestId: req.id
    });
};

const logError = (error, req) => {
    logger.error('Error Occurred', {
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode,
        method: req?.method,
        url: req?.url,
        ip: req?.ip,
        userId: req?.user?._id,
        requestId: req?.id,
        timestamp: new Date().toISOString()
    });
};

const logDatabaseQuery = (query, duration) => {
    logger.debug('Database Query', {
        query: query,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
    });
};

const logExternalAPI = (service, method, url, statusCode, duration) => {
    logger.info('External API Call', {
        service: service,
        method: method,
        url: url,
        statusCode: statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
    });
};

const logAuthentication = (userId, action, success, ip) => {
    logger.info('Authentication Event', {
        userId: userId,
        action: action,
        success: success,
        ip: ip,
        timestamp: new Date().toISOString()
    });
};

const logUserActivity = (userId, action, details) => {
    logger.info('User Activity', {
        userId: userId,
        action: action,
        details: details,
        timestamp: new Date().toISOString()
    });
};

const logSystemEvent = (event, details) => {
    logger.info('System Event', {
        event: event,
        details: details,
        timestamp: new Date().toISOString()
    });
};

const logSecurityEvent = (event, severity, details) => {
    logger.warn('Security Event', {
        event: event,
        severity: severity,
        details: details,
        timestamp: new Date().toISOString()
    });
};

const logPerformance = (operation, duration, metadata) => {
    const level = duration > 5000 ? 'warn' : 'info';
    logger.log(level, 'Performance Metric', {
        operation: operation,
        duration: `${duration}ms`,
        metadata: metadata,
        timestamp: new Date().toISOString()
    });
};

const logFileOperation = (operation, filename, userId, success) => {
    logger.info('File Operation', {
        operation: operation,
        filename: filename,
        userId: userId,
        success: success,
        timestamp: new Date().toISOString()
    });
};

const logTestExecution = (testId, projectId, status, duration) => {
    logger.info('Test Execution', {
        testId: testId,
        projectId: projectId,
        status: status,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
    });
};

const logAIAnalysis = (provider, operation, tokens, duration) => {
    logger.info('AI Analysis', {
        provider: provider,
        operation: operation,
        tokens: tokens,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
    });
};

module.exports = logger;
module.exports.stream = stream;
module.exports.logRequest = logRequest;
module.exports.logResponse = logResponse;
module.exports.logError = logError;
module.exports.logDatabaseQuery = logDatabaseQuery;
module.exports.logExternalAPI = logExternalAPI;
module.exports.logAuthentication = logAuthentication;
module.exports.logUserActivity = logUserActivity;
module.exports.logSystemEvent = logSystemEvent;
module.exports.logSecurityEvent = logSecurityEvent;
module.exports.logPerformance = logPerformance;
module.exports.logFileOperation = logFileOperation;
module.exports.logTestExecution = logTestExecution;
module.exports.logAIAnalysis = logAIAnalysis;