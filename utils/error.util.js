class AppError extends Error {
    constructor(message, statusCode) {
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, errors = []) {
        super(message, 400);
        this.errors = errors;
        this.code = 'VALIDATION_ERROR';
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401);
        this.code = 'AUTHENTICATION_ERROR';
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'You do not have permission to perform this action') {
        super(message, 403);
        this.code = 'AUTHORIZATION_ERROR';
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404);
        this.code = 'NOT_FOUND_ERROR';
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409);
        this.code = 'CONFLICT_ERROR';
    }
}

class BadRequestError extends AppError {
    constructor(message = 'Bad request') {
        super(message, 400);
        this.code = 'BAD_REQUEST_ERROR';
    }
}

class UnprocessableEntityError extends AppError {
    constructor(message = 'Unprocessable entity') {
        super(message, 422);
        this.code = 'UNPROCESSABLE_ENTITY_ERROR';
    }
}

class InternalServerError extends AppError {
    constructor(message = 'Internal server error') {
        super(message, 500);
        this.code = 'INTERNAL_SERVER_ERROR';
    }
}

class ServiceUnavailableError extends AppError {
    constructor(message = 'Service temporarily unavailable') {
        super(message, 503);
        this.code = 'SERVICE_UNAVAILABLE_ERROR';
    }
}

class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429);
        this.code = 'TOO_MANY_REQUESTS_ERROR';
    }
}

class DatabaseError extends AppError {
    constructor(message = 'Database operation failed') {
        super(message, 500);
        this.code = 'DATABASE_ERROR';
    }
}

class ExternalServiceError extends AppError {
    constructor(service, message = 'External service error') {
        super(`${service}: ${message}`, 502);
        this.code = 'EXTERNAL_SERVICE_ERROR';
        this.service = service;
    }
}

class FileUploadError extends AppError {
    constructor(message = 'File upload failed') {
        super(message, 400);
        this.code = 'FILE_UPLOAD_ERROR';
    }
}

class PaymentError extends AppError {
    constructor(message = 'Payment processing failed') {
        super(message, 402);
        this.code = 'PAYMENT_ERROR';
    }
}

class TokenExpiredError extends AppError {
    constructor(message = 'Token has expired') {
        super(message, 401);
        this.code = 'TOKEN_EXPIRED_ERROR';
    }
}

class InvalidTokenError extends AppError {
    constructor(message = 'Invalid token') {
        super(message, 401);
        this.code = 'INVALID_TOKEN_ERROR';
    }
}

class AccountLockedError extends AppError {
    constructor(message = 'Account is locked') {
        super(message, 423);
        this.code = 'ACCOUNT_LOCKED_ERROR';
    }
}

class AccountSuspendedError extends AppError {
    constructor(message = 'Account is suspended') {
        super(message, 403);
        this.code = 'ACCOUNT_SUSPENDED_ERROR';
    }
}

class ResourceLimitError extends AppError {
    constructor(message = 'Resource limit exceeded') {
        super(message, 429);
        this.code = 'RESOURCE_LIMIT_ERROR';
    }
}

class SubscriptionError extends AppError {
    constructor(message = 'Subscription required') {
        super(message, 402);
        this.code = 'SUBSCRIPTION_ERROR';
    }
}

const createError = (message, statusCode, code) => {
    const error = new AppError(message, statusCode);
    error.code = code;
    return error;
};

const throwIf = (condition, ErrorClass, message) => {
    if (condition) {
        throw new ErrorClass(message);
    }
};

const throwUnless = (condition, ErrorClass, message) => {
    if (!condition) {
        throw new ErrorClass(message);
    }
};

const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = AppError;
module.exports.AppError = AppError;
module.exports.ValidationError = ValidationError;
module.exports.AuthenticationError = AuthenticationError;
module.exports.AuthorizationError = AuthorizationError;
module.exports.NotFoundError = NotFoundError;
module.exports.ConflictError = ConflictError;
module.exports.BadRequestError = BadRequestError;
module.exports.UnprocessableEntityError = UnprocessableEntityError;
module.exports.InternalServerError = InternalServerError;
module.exports.ServiceUnavailableError = ServiceUnavailableError;
module.exports.TooManyRequestsError = TooManyRequestsError;
module.exports.DatabaseError = DatabaseError;
module.exports.ExternalServiceError = ExternalServiceError;
module.exports.FileUploadError = FileUploadError;
module.exports.PaymentError = PaymentError;
module.exports.TokenExpiredError = TokenExpiredError;
module.exports.InvalidTokenError = InvalidTokenError;
module.exports.AccountLockedError = AccountLockedError;
module.exports.AccountSuspendedError = AccountSuspendedError;
module.exports.ResourceLimitError = ResourceLimitError;
module.exports.SubscriptionError = SubscriptionError;
module.exports.createError = createError;
module.exports.throwIf = throwIf;
module.exports.throwUnless = throwUnless;
module.exports.catchAsync = catchAsync;