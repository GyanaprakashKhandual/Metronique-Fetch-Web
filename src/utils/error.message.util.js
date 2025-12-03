const ERROR_MESSAGES = {
    AUTH: {
        INVALID_CREDENTIALS: 'Invalid email or password',
        UNAUTHORIZED: 'You are not authorized to perform this action',
        TOKEN_EXPIRED: 'Your session has expired. Please login again',
        TOKEN_INVALID: 'Invalid authentication token',
        TOKEN_MISSING: 'Authentication token is required',
        ACCOUNT_DISABLED: 'Your account has been disabled',
        ACCOUNT_NOT_VERIFIED: 'Please verify your email address',
        PASSWORD_INCORRECT: 'Current password is incorrect',
        EMAIL_ALREADY_EXISTS: 'Email address already exists',
        USER_NOT_FOUND: 'User not found',
        INVALID_RESET_TOKEN: 'Invalid or expired password reset token'
    },

    USER: {
        NOT_FOUND: 'User not found',
        ALREADY_EXISTS: 'User already exists',
        CREATE_FAILED: 'Failed to create user',
        UPDATE_FAILED: 'Failed to update user',
        DELETE_FAILED: 'Failed to delete user',
        INVALID_ID: 'Invalid user ID',
        PROFILE_UPDATE_FAILED: 'Failed to update profile',
        CANNOT_DELETE_SELF: 'You cannot delete your own account'
    },

    PROJECT: {
        NOT_FOUND: 'Project not found',
        ALREADY_EXISTS: 'Project with this name already exists',
        CREATE_FAILED: 'Failed to create project',
        UPDATE_FAILED: 'Failed to update project',
        DELETE_FAILED: 'Failed to delete project',
        INVALID_ID: 'Invalid project ID',
        NO_ACCESS: 'You do not have access to this project',
        ARCHIVED: 'This project is archived',
        LIMIT_REACHED: 'Project limit reached for your account'
    },

    REPOSITORY: {
        NOT_FOUND: 'Repository not found',
        CONNECTION_FAILED: 'Failed to connect to repository',
        INVALID_URL: 'Invalid repository URL',
        SYNC_FAILED: 'Failed to sync repository',
        ALREADY_CONNECTED: 'Repository already connected to another project',
        DISCONNECTION_FAILED: 'Failed to disconnect repository',
        ANALYSIS_FAILED: 'Failed to analyze repository',
        INVALID_TOKEN: 'Invalid GitHub access token',
        NO_PERMISSION: 'Insufficient repository permissions'
    },

    DATABASE: {
        CONNECTION_FAILED: 'Failed to connect to database',
        INVALID_CREDENTIALS: 'Invalid database credentials',
        NOT_FOUND: 'Database connection not found',
        TEST_FAILED: 'Database connection test failed',
        QUERY_FAILED: 'Failed to execute database query',
        SCHEMA_ANALYSIS_FAILED: 'Failed to analyze database schema',
        ALREADY_EXISTS: 'Database connection already exists',
        INVALID_TYPE: 'Invalid database type'
    },

    TEST: {
        NOT_FOUND: 'Test not found',
        EXECUTION_FAILED: 'Test execution failed',
        GENERATION_FAILED: 'Failed to generate test scripts',
        INVALID_CONFIG: 'Invalid test configuration',
        SCRIPT_NOT_FOUND: 'Test script not found',
        SUITE_NOT_FOUND: 'Test suite not found',
        NO_TESTS_FOUND: 'No tests found to execute',
        ALREADY_RUNNING: 'Test execution already in progress'
    },

    FILE: {
        NOT_FOUND: 'File not found',
        UPLOAD_FAILED: 'File upload failed',
        DELETE_FAILED: 'Failed to delete file',
        INVALID_TYPE: 'Invalid file type',
        SIZE_EXCEEDED: 'File size exceeds limit',
        READ_FAILED: 'Failed to read file',
        WRITE_FAILED: 'Failed to write file',
        LOCKED: 'File is locked by another user',
        INVALID_NAME: 'Invalid file name',
        ALREADY_EXISTS: 'File already exists'
    },

    FOLDER: {
        NOT_FOUND: 'Folder not found',
        CREATE_FAILED: 'Failed to create folder',
        DELETE_FAILED: 'Failed to delete folder',
        NOT_EMPTY: 'Folder is not empty',
        ALREADY_EXISTS: 'Folder already exists',
        INVALID_NAME: 'Invalid folder name'
    },

    TEAM: {
        NOT_FOUND: 'Team not found',
        CREATE_FAILED: 'Failed to create team',
        UPDATE_FAILED: 'Failed to update team',
        DELETE_FAILED: 'Failed to delete team',
        NO_PERMISSION: 'You do not have permission to manage this team',
        MEMBER_EXISTS: 'User is already a team member',
        MEMBER_NOT_FOUND: 'Team member not found',
        CANNOT_REMOVE_OWNER: 'Cannot remove team owner'
    },

    INVITATION: {
        NOT_FOUND: 'Invitation not found',
        ALREADY_ACCEPTED: 'Invitation already accepted',
        EXPIRED: 'Invitation has expired',
        INVALID: 'Invalid invitation',
        SEND_FAILED: 'Failed to send invitation',
        ALREADY_MEMBER: 'User is already a team member'
    },

    AI: {
        ANALYSIS_FAILED: 'AI analysis failed',
        GENERATION_FAILED: 'Failed to generate content',
        API_ERROR: 'AI service error',
        INVALID_RESPONSE: 'Invalid AI response',
        QUOTA_EXCEEDED: 'AI usage quota exceeded',
        SERVICE_UNAVAILABLE: 'AI service temporarily unavailable'
    },

    GITHUB: {
        API_ERROR: 'GitHub API error',
        INVALID_TOKEN: 'Invalid GitHub token',
        RATE_LIMIT: 'GitHub API rate limit exceeded',
        REPOSITORY_NOT_FOUND: 'Repository not found on GitHub',
        ACCESS_DENIED: 'Access denied to GitHub repository',
        WEBHOOK_FAILED: 'Failed to configure webhook'
    },

    EXECUTION: {
        FAILED: 'Execution failed',
        TIMEOUT: 'Execution timeout',
        CANCELLED: 'Execution cancelled',
        NOT_FOUND: 'Execution not found',
        ALREADY_RUNNING: 'Execution already in progress',
        NO_PERMISSION: 'No permission to execute tests'
    },

    REPORT: {
        NOT_FOUND: 'Report not found',
        GENERATION_FAILED: 'Failed to generate report',
        EXPORT_FAILED: 'Failed to export report',
        INVALID_FORMAT: 'Invalid report format'
    },

    VALIDATION: {
        REQUIRED_FIELD: 'This field is required',
        INVALID_EMAIL: 'Invalid email address',
        INVALID_URL: 'Invalid URL',
        INVALID_FORMAT: 'Invalid format',
        TOO_SHORT: 'Value is too short',
        TOO_LONG: 'Value is too long',
        INVALID_RANGE: 'Value is out of range',
        INVALID_TYPE: 'Invalid data type'
    },

    STORAGE: {
        QUOTA_EXCEEDED: 'Storage quota exceeded',
        UPLOAD_FAILED: 'File upload failed',
        DOWNLOAD_FAILED: 'File download failed',
        DELETE_FAILED: 'Failed to delete file'
    },

    PERMISSION: {
        DENIED: 'Permission denied',
        INSUFFICIENT: 'Insufficient permissions',
        INVALID_ROLE: 'Invalid role',
        CANNOT_MODIFY: 'You cannot modify this resource'
    },

    SERVER: {
        INTERNAL_ERROR: 'Internal server error',
        SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
        DATABASE_ERROR: 'Database error occurred',
        NETWORK_ERROR: 'Network error occurred',
        TIMEOUT: 'Request timeout'
    },

    GENERAL: {
        NOT_FOUND: 'Resource not found',
        INVALID_REQUEST: 'Invalid request',
        OPERATION_FAILED: 'Operation failed',
        UNEXPECTED_ERROR: 'An unexpected error occurred',
        MAINTENANCE: 'System under maintenance'
    }
};

const getErrorMessage = (category, key, customMessage) => {
    console.log(`Getting error message for category: ${category}, key: ${key}`);

    if (!ERROR_MESSAGES[category]) {
        console.log(`Error category not found: ${category}`);
        return customMessage || ERROR_MESSAGES.GENERAL.UNEXPECTED_ERROR;
    }

    const message = ERROR_MESSAGES[category][key];
    console.log(`Error message retrieved: ${message}`);

    return customMessage || message || ERROR_MESSAGES.GENERAL.UNEXPECTED_ERROR;
};

const formatErrorResponse = (category, key, details = null) => {
    console.log(`Formatting error response - Category: ${category}, Key: ${key}`);
    const message = getErrorMessage(category, key);

    const response = {
        success: false,
        error: {
            category,
            key,
            message,
            timestamp: new Date().toISOString()
        }
    };

    if (details) {
        response.error.details = details;
        console.log(`Error details added: ${JSON.stringify(details)}`);
    }

    console.log(`Error response formatted: ${JSON.stringify(response)}`);
    return response;
};

module.exports = {
    ERROR_MESSAGES,
    getErrorMessage,
    formatErrorResponse
};