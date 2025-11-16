const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        console.log('[Team Validator] Validation failed');
        console.log('[Team Validator] Errors:', JSON.stringify(errors.array()));
        console.log('[Team Validator] Request body:', JSON.stringify(req.body));
        console.log('[Team Validator] Request params:', JSON.stringify(req.params));

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

    console.log('[Team Validator] Validation passed');
    console.log('[Team Validator] Validated data:', JSON.stringify(req.body));
    next();
};

const validateTeamCreation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Team name is required')
        .isLength({ min: 3, max: 100 })
        .withMessage('Team name must be between 3 and 100 characters')
        .matches(/^[a-zA-Z0-9\s\-_]+$/)
        .withMessage('Team name can only contain letters, numbers, spaces, hyphens and underscores'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),

    body('visibility')
        .optional()
        .isIn(['private', 'public'])
        .withMessage('Visibility must be either private or public'),

    body('allowMemberInvites')
        .optional()
        .isBoolean()
        .withMessage('Allow member invites must be a boolean'),

    body('requireApprovalForJoin')
        .optional()
        .isBoolean()
        .withMessage('Require approval for join must be a boolean'),

    body('defaultMemberRole')
        .optional()
        .isIn(['viewer', 'member', 'admin'])
        .withMessage('Default member role must be viewer, member, or admin'),

    handleValidationErrors
];

const validateTeamUpdate = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Team name must be between 3 and 100 characters')
        .matches(/^[a-zA-Z0-9\s\-_]+$/)
        .withMessage('Team name can only contain letters, numbers, spaces, hyphens and underscores'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),

    body('settings.visibility')
        .optional()
        .isIn(['private', 'public'])
        .withMessage('Visibility must be either private or public'),

    body('settings.allowMemberInvites')
        .optional()
        .isBoolean()
        .withMessage('Allow member invites must be a boolean'),

    body('settings.requireApprovalForJoin')
        .optional()
        .isBoolean()
        .withMessage('Require approval for join must be a boolean'),

    body('settings.defaultMemberRole')
        .optional()
        .isIn(['viewer', 'member', 'admin'])
        .withMessage('Default member role must be viewer, member, or admin'),

    handleValidationErrors
];

const validateTeamId = [
    param('teamId')
        .notEmpty()
        .withMessage('Team ID is required')
        .isMongoId()
        .withMessage('Invalid team ID format'),

    handleValidationErrors
];

const validateTeamSlug = [
    param('slug')
        .notEmpty()
        .withMessage('Team slug is required')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Team slug must be between 3 and 100 characters')
        .matches(/^[a-z0-9\-]+$/)
        .withMessage('Team slug can only contain lowercase letters, numbers and hyphens'),

    handleValidationErrors
];

const validateTeamQuery = [
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

    query('visibility')
        .optional()
        .isIn(['private', 'public'])
        .withMessage('Invalid visibility filter'),

    query('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('Invalid status filter'),

    query('sortBy')
        .optional()
        .isIn(['createdAt', 'name', 'totalMembers', 'totalProjects'])
        .withMessage('Invalid sort field'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),

    handleValidationErrors
];

const validateAddMember = [
    body('userId')
        .notEmpty()
        .withMessage('User ID is required')
        .isMongoId()
        .withMessage('Invalid user ID format'),

    body('role')
        .notEmpty()
        .withMessage('Role is required')
        .isIn(['owner', 'admin', 'member', 'viewer'])
        .withMessage('Role must be owner, admin, member, or viewer'),

    body('customPermissions')
        .optional()
        .isObject()
        .withMessage('Custom permissions must be an object'),

    body('customPermissions.canManageTeam')
        .optional()
        .isBoolean()
        .withMessage('canManageTeam must be a boolean'),

    body('customPermissions.canManageProjects')
        .optional()
        .isBoolean()
        .withMessage('canManageProjects must be a boolean'),

    body('customPermissions.canCreateProjects')
        .optional()
        .isBoolean()
        .withMessage('canCreateProjects must be a boolean'),

    body('customPermissions.canDeleteProjects')
        .optional()
        .isBoolean()
        .withMessage('canDeleteProjects must be a boolean'),

    body('customPermissions.canManageMembers')
        .optional()
        .isBoolean()
        .withMessage('canManageMembers must be a boolean'),

    body('customPermissions.canInviteMembers')
        .optional()
        .isBoolean()
        .withMessage('canInviteMembers must be a boolean'),

    body('customPermissions.canRemoveMembers')
        .optional()
        .isBoolean()
        .withMessage('canRemoveMembers must be a boolean'),

    body('customPermissions.canRunTests')
        .optional()
        .isBoolean()
        .withMessage('canRunTests must be a boolean'),

    body('customPermissions.canViewTests')
        .optional()
        .isBoolean()
        .withMessage('canViewTests must be a boolean'),

    body('customPermissions.canEditTests')
        .optional()
        .isBoolean()
        .withMessage('canEditTests must be a boolean'),

    body('customPermissions.canDeleteTests')
        .optional()
        .isBoolean()
        .withMessage('canDeleteTests must be a boolean'),

    body('customPermissions.canViewReports')
        .optional()
        .isBoolean()
        .withMessage('canViewReports must be a boolean'),

    body('customPermissions.canExportReports')
        .optional()
        .isBoolean()
        .withMessage('canExportReports must be a boolean'),

    body('customPermissions.canManageBilling')
        .optional()
        .isBoolean()
        .withMessage('canManageBilling must be a boolean'),

    body('customPermissions.canManageIntegrations')
        .optional()
        .isBoolean()
        .withMessage('canManageIntegrations must be a boolean'),

    handleValidationErrors
];

const validateRemoveMember = [
    param('teamId')
        .notEmpty()
        .withMessage('Team ID is required')
        .isMongoId()
        .withMessage('Invalid team ID format'),

    param('memberId')
        .notEmpty()
        .withMessage('Member ID is required')
        .isMongoId()
        .withMessage('Invalid member ID format'),

    handleValidationErrors
];

const validateUpdateMemberRole = [
    body('role')
        .notEmpty()
        .withMessage('Role is required')
        .isIn(['owner', 'admin', 'member', 'viewer'])
        .withMessage('Role must be owner, admin, member, or viewer'),

    handleValidationErrors
];

const validateUpdateMemberPermissions = [
    body('permissions')
        .notEmpty()
        .withMessage('Permissions object is required')
        .isObject()
        .withMessage('Permissions must be an object'),

    body('permissions.canManageTeam')
        .optional()
        .isBoolean()
        .withMessage('canManageTeam must be a boolean'),

    body('permissions.canManageProjects')
        .optional()
        .isBoolean()
        .withMessage('canManageProjects must be a boolean'),

    body('permissions.canCreateProjects')
        .optional()
        .isBoolean()
        .withMessage('canCreateProjects must be a boolean'),

    body('permissions.canDeleteProjects')
        .optional()
        .isBoolean()
        .withMessage('canDeleteProjects must be a boolean'),

    body('permissions.canManageMembers')
        .optional()
        .isBoolean()
        .withMessage('canManageMembers must be a boolean'),

    body('permissions.canInviteMembers')
        .optional()
        .isBoolean()
        .withMessage('canInviteMembers must be a boolean'),

    body('permissions.canRemoveMembers')
        .optional()
        .isBoolean()
        .withMessage('canRemoveMembers must be a boolean'),

    body('permissions.canRunTests')
        .optional()
        .isBoolean()
        .withMessage('canRunTests must be a boolean'),

    body('permissions.canViewTests')
        .optional()
        .isBoolean()
        .withMessage('canViewTests must be a boolean'),

    body('permissions.canEditTests')
        .optional()
        .isBoolean()
        .withMessage('canEditTests must be a boolean'),

    body('permissions.canDeleteTests')
        .optional()
        .isBoolean()
        .withMessage('canDeleteTests must be a boolean'),

    body('permissions.canViewReports')
        .optional()
        .isBoolean()
        .withMessage('canViewReports must be a boolean'),

    body('permissions.canExportReports')
        .optional()
        .isBoolean()
        .withMessage('canExportReports must be a boolean'),

    body('permissions.canManageBilling')
        .optional()
        .isBoolean()
        .withMessage('canManageBilling must be a boolean'),

    body('permissions.canManageIntegrations')
        .optional()
        .isBoolean()
        .withMessage('canManageIntegrations must be a boolean'),

    handleValidationErrors
];

const validateMemberStatus = [
    body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['active', 'inactive', 'suspended'])
        .withMessage('Status must be active, inactive, or suspended'),

    handleValidationErrors
];

const validateTeamSubscription = [
    body('plan')
        .notEmpty()
        .withMessage('Subscription plan is required')
        .isIn(['free', 'team', 'business', 'enterprise'])
        .withMessage('Plan must be free, team, business, or enterprise'),

    body('seats')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Seats must be between 1 and 1000'),

    body('billingEmail')
        .optional()
        .isEmail()
        .withMessage('Invalid billing email format')
        .normalizeEmail(),

    handleValidationErrors
];

const validateTeamBilling = [
    body('billingEmail')
        .notEmpty()
        .withMessage('Billing email is required')
        .isEmail()
        .withMessage('Invalid billing email format')
        .normalizeEmail(),

    body('stripeCustomerId')
        .optional()
        .isString()
        .withMessage('Stripe customer ID must be a string'),

    body('stripeSubscriptionId')
        .optional()
        .isString()
        .withMessage('Stripe subscription ID must be a string'),

    handleValidationErrors
];

const validateTransferOwnership = [
    body('newOwnerId')
        .notEmpty()
        .withMessage('New owner ID is required')
        .isMongoId()
        .withMessage('Invalid new owner ID format'),

    body('confirmTransfer')
        .notEmpty()
        .withMessage('Transfer confirmation is required')
        .isBoolean()
        .withMessage('Confirmation must be a boolean')
        .custom((value) => {
            if (value !== true) {
                throw new Error('You must confirm ownership transfer');
            }
            return true;
        }),

    handleValidationErrors
];

const validateTeamDelete = [
    body('confirmDelete')
        .notEmpty()
        .withMessage('Delete confirmation is required')
        .isBoolean()
        .withMessage('Confirmation must be a boolean')
        .custom((value) => {
            if (value !== true) {
                throw new Error('You must confirm team deletion');
            }
            return true;
        }),

    body('password')
        .notEmpty()
        .withMessage('Password is required to delete team'),

    handleValidationErrors
];

const validateInviteMember = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),

    body('role')
        .notEmpty()
        .withMessage('Role is required')
        .isIn(['admin', 'member', 'viewer'])
        .withMessage('Role must be admin, member, or viewer'),

    body('message')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Message must not exceed 500 characters'),

    handleValidationErrors
];

const validateBulkInviteMembers = [
    body('invitations')
        .notEmpty()
        .withMessage('Invitations array is required')
        .isArray({ min: 1, max: 50 })
        .withMessage('Invitations must be an array with 1 to 50 items'),

    body('invitations.*.email')
        .notEmpty()
        .withMessage('Email is required for each invitation')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),

    body('invitations.*.role')
        .notEmpty()
        .withMessage('Role is required for each invitation')
        .isIn(['admin', 'member', 'viewer'])
        .withMessage('Role must be admin, member, or viewer'),

    handleValidationErrors
];

const validateMemberQuery = [
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
        .isIn(['owner', 'admin', 'member', 'viewer'])
        .withMessage('Invalid role filter'),

    query('status')
        .optional()
        .isIn(['active', 'inactive', 'suspended'])
        .withMessage('Invalid status filter'),

    query('sortBy')
        .optional()
        .isIn(['joinedAt', 'lastActiveAt', 'role'])
        .withMessage('Invalid sort field'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),

    handleValidationErrors
];

const validateLeaveTeam = [
    body('confirmLeave')
        .notEmpty()
        .withMessage('Leave confirmation is required')
        .isBoolean()
        .withMessage('Confirmation must be a boolean')
        .custom((value) => {
            if (value !== true) {
                throw new Error('You must confirm leaving the team');
            }
            return true;
        }),

    handleValidationErrors
];

const validateTeamSettings = [
    body('settings')
        .notEmpty()
        .withMessage('Settings object is required')
        .isObject()
        .withMessage('Settings must be an object'),

    body('settings.visibility')
        .optional()
        .isIn(['private', 'public'])
        .withMessage('Visibility must be either private or public'),

    body('settings.allowMemberInvites')
        .optional()
        .isBoolean()
        .withMessage('Allow member invites must be a boolean'),

    body('settings.requireApprovalForJoin')
        .optional()
        .isBoolean()
        .withMessage('Require approval for join must be a boolean'),

    body('settings.defaultMemberRole')
        .optional()
        .isIn(['viewer', 'member', 'admin'])
        .withMessage('Default member role must be viewer, member, or admin'),

    handleValidationErrors
];

const validateMemberId = [
    param('memberId')
        .notEmpty()
        .withMessage('Member ID is required')
        .isMongoId()
        .withMessage('Invalid member ID format'),

    handleValidationErrors
];

const validateBulkMemberOperation = [
    body('memberIds')
        .notEmpty()
        .withMessage('Member IDs array is required')
        .isArray({ min: 1, max: 50 })
        .withMessage('Member IDs must be an array with 1 to 50 items'),

    body('memberIds.*')
        .isMongoId()
        .withMessage('Each member ID must be a valid MongoDB ObjectId'),

    body('operation')
        .notEmpty()
        .withMessage('Operation is required')
        .isIn(['activate', 'deactivate', 'suspend', 'remove'])
        .withMessage('Invalid operation type'),

    handleValidationErrors
];

module.exports = {
    validateTeamCreation,
    validateTeamUpdate,
    validateTeamId,
    validateTeamSlug,
    validateTeamQuery,
    validateAddMember,
    validateRemoveMember,
    validateUpdateMemberRole,
    validateUpdateMemberPermissions,
    validateMemberStatus,
    validateTeamSubscription,
    validateTeamBilling,
    validateTransferOwnership,
    validateTeamDelete,
    validateInviteMember,
    validateBulkInviteMembers,
    validateMemberQuery,
    validateLeaveTeam,
    validateTeamSettings,
    validateMemberId,
    validateBulkMemberOperation,
    handleValidationErrors
};