const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        console.log('[User Validator] Validation failed');
        console.log('[User Validator] Errors:', JSON.stringify(errors.array()));
        console.log('[User Validator] Request body:', JSON.stringify(req.body));
        console.log('[User Validator] Request params:', JSON.stringify(req.params));

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path || err.param,
                message: err.msg,
                value: err.value
            }))
        });
    }

    console.log('[User Validator] Validation passed');
    console.log('[User Validator] Validated data:', JSON.stringify(req.body));
    next();
};

const validateUserRegistration = [
    body('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('First name can only contain letters and spaces'),

    body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Last name can only contain letters and spaces'),

    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('Email must not exceed 100 characters'),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8, max: 100 })
        .withMessage('Password must be between 8 and 100 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),

    body('confirmPassword')
        .notEmpty()
        .withMessage('Confirm password is required')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    body('username')
        .optional()
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers and underscores'),

    body('phone.countryCode')
        .optional()
        .matches(/^\+\d{1,4}$/)
        .withMessage('Invalid country code format'),

    body('phone.number')
        .optional()
        .matches(/^\d{10,15}$/)
        .withMessage('Phone number must be between 10 and 15 digits'),

    body('timezone')
        .optional()
        .isString()
        .withMessage('Timezone must be a string'),

    body('language')
        .optional()
        .isIn(['en', 'es', 'fr', 'de', 'pt', 'hi', 'ja', 'zh'])
        .withMessage('Invalid language selection'),

    handleValidationErrors
];

const validateUserLogin = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Password is required'),

    handleValidationErrors
];

const validateUserUpdate = [
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('First name can only contain letters and spaces'),

    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Last name can only contain letters and spaces'),

    body('username')
        .optional()
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers and underscores'),

    body('bio')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio must not exceed 500 characters'),

    body('phone.countryCode')
        .optional()
        .matches(/^\+\d{1,4}$/)
        .withMessage('Invalid country code format'),

    body('phone.number')
        .optional()
        .matches(/^\d{10,15}$/)
        .withMessage('Phone number must be between 10 and 15 digits'),

    body('timezone')
        .optional()
        .isString()
        .withMessage('Timezone must be a string'),

    body('language')
        .optional()
        .isIn(['en', 'es', 'fr', 'de', 'pt', 'hi', 'ja', 'zh'])
        .withMessage('Invalid language selection'),

    handleValidationErrors
];

const validatePasswordChange = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),

    body('newPassword')
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 8, max: 100 })
        .withMessage('New password must be between 8 and 100 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number and one special character')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('New password must be different from current password');
            }
            return true;
        }),

    body('confirmNewPassword')
        .notEmpty()
        .withMessage('Confirm new password is required')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    handleValidationErrors
];

const validatePasswordReset = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    handleValidationErrors
];

const validatePasswordResetConfirm = [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required')
        .isString()
        .withMessage('Invalid token format'),

    body('newPassword')
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 8, max: 100 })
        .withMessage('New password must be between 8 and 100 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),

    body('confirmPassword')
        .notEmpty()
        .withMessage('Confirm password is required')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    handleValidationErrors
];

const validateEmailVerification = [
    body('token')
        .notEmpty()
        .withMessage('Verification token is required')
        .isString()
        .withMessage('Invalid token format'),

    handleValidationErrors
];

const validateResendVerification = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    handleValidationErrors
];

const validateUserPreferences = [
    body('preferences.emailNotifications.testCompleted')
        .optional()
        .isBoolean()
        .withMessage('testCompleted must be a boolean'),

    body('preferences.emailNotifications.testFailed')
        .optional()
        .isBoolean()
        .withMessage('testFailed must be a boolean'),

    body('preferences.emailNotifications.weeklyReport')
        .optional()
        .isBoolean()
        .withMessage('weeklyReport must be a boolean'),

    body('preferences.emailNotifications.teamInvites')
        .optional()
        .isBoolean()
        .withMessage('teamInvites must be a boolean'),

    body('preferences.emailNotifications.productUpdates')
        .optional()
        .isBoolean()
        .withMessage('productUpdates must be a boolean'),

    body('preferences.slackNotifications.enabled')
        .optional()
        .isBoolean()
        .withMessage('Slack notifications enabled must be a boolean'),

    body('preferences.slackNotifications.webhookUrl')
        .optional()
        .isURL()
        .withMessage('Invalid webhook URL format'),

    body('preferences.theme')
        .optional()
        .isIn(['light', 'dark', 'auto'])
        .withMessage('Theme must be light, dark, or auto'),

    body('preferences.defaultDashboard')
        .optional()
        .isIn(['overview', 'projects', 'tests', 'reports'])
        .withMessage('Invalid default dashboard selection'),

    handleValidationErrors
];

const validateUserId = [
    param('userId')
        .notEmpty()
        .withMessage('User ID is required')
        .isMongoId()
        .withMessage('Invalid user ID format'),

    handleValidationErrors
];

const validateUserQuery = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

    query('search')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search term must be between 1 and 100 characters'),

    query('role')
        .optional()
        .isIn(['user', 'admin', 'super_admin'])
        .withMessage('Invalid role filter'),

    query('status')
        .optional()
        .isIn(['active', 'inactive', 'suspended'])
        .withMessage('Invalid status filter'),

    query('sortBy')
        .optional()
        .isIn(['createdAt', 'firstName', 'lastName', 'email', 'lastLogin'])
        .withMessage('Invalid sort field'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),

    handleValidationErrors
];

const validateUserRole = [
    body('role')
        .notEmpty()
        .withMessage('Role is required')
        .isIn(['user', 'admin', 'super_admin'])
        .withMessage('Invalid role selection'),

    handleValidationErrors
];

const validateUserStatus = [
    body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['active', 'inactive', 'suspended'])
        .withMessage('Invalid status selection'),

    body('reason')
        .if(body('status').equals('suspended'))
        .notEmpty()
        .withMessage('Reason is required when suspending a user')
        .isLength({ min: 10, max: 500 })
        .withMessage('Reason must be between 10 and 500 characters'),

    handleValidationErrors
];

const validateTwoFactorSetup = [
    body('secret')
        .notEmpty()
        .withMessage('Two-factor secret is required')
        .isString()
        .withMessage('Invalid secret format'),

    body('token')
        .notEmpty()
        .withMessage('Verification token is required')
        .matches(/^\d{6}$/)
        .withMessage('Token must be a 6-digit code'),

    handleValidationErrors
];

const validateTwoFactorVerify = [
    body('token')
        .notEmpty()
        .withMessage('Verification token is required')
        .matches(/^\d{6}$/)
        .withMessage('Token must be a 6-digit code'),

    handleValidationErrors
];

const validateTwoFactorDisable = [
    body('password')
        .notEmpty()
        .withMessage('Password is required for two-factor authentication disable'),

    handleValidationErrors
];

const validateAvatarUpload = [
    body('avatarUrl')
        .optional()
        .isURL()
        .withMessage('Invalid avatar URL format'),

    handleValidationErrors
];

const validateUserDelete = [
    body('password')
        .notEmpty()
        .withMessage('Password is required to delete account'),

    body('confirmDelete')
        .notEmpty()
        .withMessage('Confirmation is required')
        .isBoolean()
        .withMessage('Confirmation must be a boolean')
        .custom((value) => {
            if (value !== true) {
                throw new Error('You must confirm account deletion');
            }
            return true;
        }),

    handleValidationErrors
];

const validateReferralCode = [
    param('code')
        .notEmpty()
        .withMessage('Referral code is required')
        .isLength({ min: 8, max: 8 })
        .withMessage('Invalid referral code length')
        .matches(/^[A-Z0-9]{8}$/)
        .withMessage('Invalid referral code format'),

    handleValidationErrors
];

const validateSubscriptionUpdate = [
    body('plan')
        .notEmpty()
        .withMessage('Subscription plan is required')
        .isIn(['free', 'starter', 'professional', 'enterprise', 'custom'])
        .withMessage('Invalid subscription plan'),

    handleValidationErrors
];

const validateIntegrationConnect = [
    body('provider')
        .notEmpty()
        .withMessage('Integration provider is required')
        .isIn(['github', 'slack', 'jira'])
        .withMessage('Invalid integration provider'),

    body('accessToken')
        .notEmpty()
        .withMessage('Access token is required')
        .isString()
        .withMessage('Invalid access token format'),

    body('refreshToken')
        .optional()
        .isString()
        .withMessage('Invalid refresh token format'),

    handleValidationErrors
];

const validateIntegrationDisconnect = [
    body('provider')
        .notEmpty()
        .withMessage('Integration provider is required')
        .isIn(['github', 'slack', 'jira'])
        .withMessage('Invalid integration provider'),

    handleValidationErrors
];

const validateBulkUserOperation = [
    body('userIds')
        .notEmpty()
        .withMessage('User IDs array is required')
        .isArray({ min: 1, max: 100 })
        .withMessage('User IDs must be an array with 1 to 100 items'),

    body('userIds.*')
        .isMongoId()
        .withMessage('Each user ID must be a valid MongoDB ObjectId'),

    body('operation')
        .notEmpty()
        .withMessage('Operation is required')
        .isIn(['activate', 'deactivate', 'suspend', 'delete'])
        .withMessage('Invalid operation type'),

    handleValidationErrors
];

module.exports = {
    validateUserRegistration,
    validateUserLogin,
    validateUserUpdate,
    validatePasswordChange,
    validatePasswordReset,
    validatePasswordResetConfirm,
    validateEmailVerification,
    validateResendVerification,
    validateUserPreferences,
    validateUserId,
    validateUserQuery,
    validateUserRole,
    validateUserStatus,
    validateTwoFactorSetup,
    validateTwoFactorVerify,
    validateTwoFactorDisable,
    validateAvatarUpload,
    validateUserDelete,
    validateReferralCode,
    validateSubscriptionUpdate,
    validateIntegrationConnect,
    validateIntegrationDisconnect,
    validateBulkUserOperation,
    handleValidationErrors
};