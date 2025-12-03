const AppError = require('../utils/error.util');
const logger = require('../utils/logger.util');

const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate field value: ${field} = "${value}". Please use another value.`;
    return new AppError(message, 409);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleJWTError = () => {
    return new AppError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = () => {
    return new AppError('Your token has expired. Please log in again.', 401);
};

const handleMulterError = (err) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return new AppError('File size is too large. Maximum size allowed is 10MB.', 400);
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
        return new AppError('Too many files uploaded.', 400);
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return new AppError('Unexpected file field.', 400);
    }
    return new AppError(err.message, 400);
};

const handleMongoServerError = (err) => {
    if (err.code === 11000) {
        return handleDuplicateFieldsDB(err);
    }
    return new AppError('Database server error occurred.', 500);
};

const handleSequelizeValidationError = (err) => {
    const errors = err.errors.map(e => e.message);
    const message = `Validation error. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleSequelizeUniqueConstraintError = (err) => {
    const field = err.errors[0].path;
    const message = `Duplicate field value: ${field}. Please use another value.`;
    return new AppError(message, 409);
};

const handleSequelizeForeignKeyConstraintError = () => {
    return new AppError('Foreign key constraint violation.', 400);
};

const handleSequelizeDatabaseError = (err) => {
    return new AppError(err.message || 'Database error occurred.', 500);
};

const handleAxiosError = (err) => {
    if (err.response) {
        return new AppError(
            err.response.data.message || 'External API request failed.',
            err.response.status
        );
    }
    if (err.request) {
        return new AppError('No response received from external API.', 503);
    }
    return new AppError('Error setting up external API request.', 500);
};

const handleOpenAIError = (err) => {
    if (err.response?.status === 429) {
        return new AppError('OpenAI API rate limit exceeded. Please try again later.', 429);
    }
    if (err.response?.status === 401) {
        return new AppError('OpenAI API authentication failed.', 500);
    }
    return new AppError('OpenAI API error occurred.', 500);
};

const handleAnthropicError = (err) => {
    if (err.status === 429) {
        return new AppError('Anthropic API rate limit exceeded. Please try again later.', 429);
    }
    if (err.status === 401) {
        return new AppError('Anthropic API authentication failed.', 500);
    }
    return new AppError('Anthropic API error occurred.', 500);
};

const handleGitHubError = (err) => {
    if (err.status === 404) {
        return new AppError('GitHub repository not found.', 404);
    }
    if (err.status === 403) {
        return new AppError('GitHub API rate limit exceeded or access denied.', 403);
    }
    if (err.status === 401) {
        return new AppError('GitHub authentication failed. Please reconnect your account.', 401);
    }
    return new AppError('GitHub API error occurred.', 500);
};

const handleStripeError = (err) => {
    if (err.type === 'StripeCardError') {
        return new AppError(err.message, 400);
    }
    if (err.type === 'StripeInvalidRequestError') {
        return new AppError('Invalid payment request.', 400);
    }
    if (err.type === 'StripeAPIError') {
        return new AppError('Payment processing error. Please try again.', 500);
    }
    return new AppError('Payment error occurred.', 500);
};

const handleS3Error = (err) => {
    if (err.code === 'NoSuchKey') {
        return new AppError('File not found in storage.', 404);
    }
    if (err.code === 'AccessDenied') {
        return new AppError('Access denied to storage.', 403);
    }
    return new AppError('Storage error occurred.', 500);
};

const sendErrorDevelopment = (err, req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            success: false,
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString(),
            requestId: req.id
        });
    }

    res.status(err.statusCode).json({
        success: false,
        title: 'Something went wrong!',
        message: err.message,
        stack: err.stack
    });
};

const sendErrorProduction = (err, req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                success: false,
                status: err.status,
                message: err.message,
                error: err.code || err.status,
                timestamp: new Date().toISOString(),
                requestId: req.id
            });
        }

        logger.error('ERROR 💥', err);
        return res.status(500).json({
            success: false,
            status: 'error',
            message: 'Something went wrong. Please try again later.',
            timestamp: new Date().toISOString(),
            requestId: req.id
        });
    }

    if (err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            title: 'Something went wrong!',
            message: err.message
        });
    }

    logger.error('ERROR 💥', err);
    return res.status(500).json({
        success: false,
        title: 'Something went wrong!',
        message: 'Please try again later.'
    });
};

const logError = (err, req) => {
    const errorLog = {
        message: err.message,
        statusCode: err.statusCode,
        status: err.status,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        user: req.user?._id || 'unauthenticated',
        timestamp: new Date().toISOString(),
        requestId: req.id,
        body: req.body,
        query: req.query,
        params: req.params
    };

    if (err.statusCode >= 500) {
        logger.error('Server Error:', errorLog);
    } else if (err.statusCode >= 400) {
        logger.warn('Client Error:', errorLog);
    } else {
        logger.info('Error:', errorLog);
    }
};

const notFoundHandler = (req, res, next) => {
    const error = new AppError(
        `Cannot ${req.method} ${req.originalUrl} - Route not found`,
        404
    );
    next(error);
};

const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    logError(err, req);

    if (process.env.NODE_ENV === 'development') {
        sendErrorDevelopment(err, req, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = { ...err };
        error.message = err.message;
        error.name = err.name;

        if (err.name === 'CastError') error = handleCastErrorDB(err);
        if (err.code === 11000) error = handleDuplicateFieldsDB(err);
        if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
        if (err.name === 'JsonWebTokenError') error = handleJWTError();
        if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
        if (err.name === 'MulterError') error = handleMulterError(err);
        if (err.name === 'MongoServerError') error = handleMongoServerError(err);
        if (err.name === 'SequelizeValidationError') error = handleSequelizeValidationError(err);
        if (err.name === 'SequelizeUniqueConstraintError') error = handleSequelizeUniqueConstraintError(err);
        if (err.name === 'SequelizeForeignKeyConstraintError') error = handleSequelizeForeignKeyConstraintError();
        if (err.name === 'SequelizeDatabaseError') error = handleSequelizeDatabaseError(err);
        if (err.isAxiosError) error = handleAxiosError(err);
        if (err.message?.includes('OpenAI')) error = handleOpenAIError(err);
        if (err.message?.includes('Anthropic')) error = handleAnthropicError(err);
        if (err.message?.includes('GitHub')) error = handleGitHubError(err);
        if (err.type?.includes('Stripe')) error = handleStripeError(err);
        if (err.code?.includes('S3') || err.code === 'NoSuchKey') error = handleS3Error(err);

        sendErrorProduction(error, req, res);
    }
};

const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

const validationErrorHandler = (validationErrors) => {
    const errors = validationErrors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
    }));

    return {
        success: false,
        message: 'Validation failed',
        errors: errors,
        count: errors.length
    };
};

const handleUncaughtException = () => {
    process.on('uncaughtException', (err) => {
        logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
        logger.error(err.name, err.message);
        logger.error(err.stack);
        process.exit(1);
    });
};

const handleUnhandledRejection = (server) => {
    process.on('unhandledRejection', (err) => {
        logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
        logger.error(err.name, err.message);
        logger.error(err.stack);
        server.close(() => {
            process.exit(1);
        });
    });
};

const handleSIGTERM = (server) => {
    process.on('SIGTERM', () => {
        logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
        server.close(() => {
            logger.info('💥 Process terminated!');
        });
    });
};

module.exports = {
    globalErrorHandler,
    notFoundHandler,
    asyncHandler,
    validationErrorHandler,
    handleUncaughtException,
    handleUnhandledRejection,
    handleSIGTERM,
    handleCastErrorDB,
    handleDuplicateFieldsDB,
    handleValidationErrorDB,
    handleJWTError,
    handleJWTExpiredError,
    handleMulterError,
    handleMongoServerError,
    handleSequelizeValidationError,
    handleSequelizeUniqueConstraintError,
    handleSequelizeForeignKeyConstraintError,
    handleSequelizeDatabaseError,
    handleAxiosError,
    handleOpenAIError,
    handleAnthropicError,
    handleGitHubError,
    handleStripeError,
    handleS3Error
};