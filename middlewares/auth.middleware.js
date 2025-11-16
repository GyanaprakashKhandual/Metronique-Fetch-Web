const User = require('../models/user.model');
const ProjectAccess = require('../models/project.access.model');
const {
    verifyAccessToken,
    verifyRefreshToken,
    generateAccessToken
} = require('../configs/jwt.config');

const protect = async (req, res, next) => {
    const startTime = Date.now();

    try {
        console.log(`[AUTH_PROTECT] START | IP: ${req.ip} | Path: ${req.path}`);

        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
            console.log(`[AUTH_PROTECT] TOKEN_SOURCE | Source: Authorization Header`);
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
            console.log(`[AUTH_PROTECT] TOKEN_SOURCE | Source: Cookies`);
        }

        if (!token) {
            console.warn(`[AUTH_PROTECT] NO_TOKEN | IP: ${req.ip}`);
            return res.status(401).json({
                success: false,
                message: 'Not authorized, token missing',
                code: 'TOKEN_MISSING'
            });
        }

        let decoded;

        try {
            decoded = verifyAccessToken(token);
            console.log(`[AUTH_PROTECT] TOKEN_VERIFIED | User ID: ${decoded.id} | Token Type: Access`);
        } catch (tokenError) {
            if (tokenError.name === 'TokenExpiredError') {
                console.warn(`[AUTH_PROTECT] TOKEN_EXPIRED | User ID: ${decoded?.id || 'unknown'}`);
                return res.status(401).json({
                    success: false,
                    message: 'Token has expired',
                    code: 'TOKEN_EXPIRED'
                });
            } else if (tokenError.name === 'JsonWebTokenError') {
                console.warn(`[AUTH_PROTECT] INVALID_TOKEN | Error: ${tokenError.message}`);
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token',
                    code: 'INVALID_TOKEN'
                });
            } else {
                throw tokenError;
            }
        }

        if (!decoded || !decoded.id) {
            console.warn(`[AUTH_PROTECT] INVALID_PAYLOAD | Decoded: ${JSON.stringify(decoded)}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid token payload',
                code: 'INVALID_PAYLOAD'
            });
        }

        const user = await User.findById(decoded.id).select('-password -twoFactorSecret -backupCodes -emailVerificationToken -passwordResetToken');

        if (!user) {
            console.warn(`[AUTH_PROTECT] USER_NOT_FOUND | User ID: ${decoded.id}`);
            return res.status(401).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        if (!user.isActive) {
            console.warn(`[AUTH_PROTECT] USER_INACTIVE | User ID: ${user._id}`);
            return res.status(401).json({
                success: false,
                message: 'User account is inactive',
                code: 'USER_INACTIVE'
            });
        }

        if (user.isSuspended) {
            console.warn(`[AUTH_PROTECT] USER_SUSPENDED | User ID: ${user._id} | Reason: ${user.suspensionReason}`);
            return res.status(403).json({
                success: false,
                message: 'User account is suspended',
                code: 'USER_SUSPENDED',
                reason: user.suspensionReason
            });
        }

        if (user.isDeleted) {
            console.warn(`[AUTH_PROTECT] USER_DELETED | User ID: ${user._id}`);
            return res.status(401).json({
                success: false,
                message: 'User account has been deleted',
                code: 'USER_DELETED'
            });
        }

        user.lastLogin = new Date();
        user.lastLoginIP = req.ip;
        await user.save();

        console.log(`[AUTH_PROTECT] USER_UPDATED | User ID: ${user._id} | Last Login: ${user.lastLogin}`);

        req.user = user;
        req.token = token;

        console.log(`[AUTH_PROTECT] SUCCESS | User ID: ${user._id} | Email: ${user.email} | Role: ${user.role} | Duration: ${Date.now() - startTime}ms`);

        next();
    } catch (error) {
        console.error(`[AUTH_PROTECT] ERROR | Error: ${error.message} | Stack: ${error.stack} | Duration: ${Date.now() - startTime}ms`);

        return res.status(500).json({
            success: false,
            message: 'Authentication failed',
            error: error.message,
            code: 'AUTH_ERROR'
        });
    }
};

const authorize = (...allowedRoles) => {
    return async (req, res, next) => {
        const startTime = Date.now();

        try {
            console.log(`[AUTH_AUTHORIZE] START | User ID: ${req.user?._id} | Required Roles: ${allowedRoles.join(', ')}`);

            if (!req.user) {
                console.warn(`[AUTH_AUTHORIZE] NO_USER | User not authenticated`);
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized',
                    code: 'NOT_AUTHENTICATED'
                });
            }

            if (allowedRoles.length === 0) {
                console.log(`[AUTH_AUTHORIZE] NO_ROLES_REQUIRED | User ID: ${req.user._id}`);
                return next();
            }

            if (!allowedRoles.includes(req.user.role)) {
                console.warn(`[AUTH_AUTHORIZE] INSUFFICIENT_ROLE | User ID: ${req.user._id} | User Role: ${req.user.role} | Required: ${allowedRoles.join(', ')}`);
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: insufficient privileges',
                    code: 'INSUFFICIENT_PRIVILEGES',
                    userRole: req.user.role,
                    requiredRoles: allowedRoles
                });
            }

            console.log(`[AUTH_AUTHORIZE] SUCCESS | User ID: ${req.user._id} | Role: ${req.user.role} | Duration: ${Date.now() - startTime}ms`);

            next();
        } catch (error) {
            console.error(`[AUTH_AUTHORIZE] ERROR | User ID: ${req.user?._id} | Error: ${error.message} | Duration: ${Date.now() - startTime}ms`);

            return res.status(500).json({
                success: false,
                message: 'Authorization failed',
                error: error.message,
                code: 'AUTHORIZE_ERROR'
            });
        }
    };
};

const authorizePermission = (...requiredPermissions) => {
    return async (req, res, next) => {
        const startTime = Date.now();

        try {
            console.log(`[AUTH_PERMISSION] START | User ID: ${req.user?._id} | Required Permissions: ${requiredPermissions.join(', ')}`);

            if (!req.user) {
                console.warn(`[AUTH_PERMISSION] NO_USER | User not authenticated`);
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized',
                    code: 'NOT_AUTHENTICATED'
                });
            }

            if (requiredPermissions.length === 0) {
                console.log(`[AUTH_PERMISSION] NO_PERMISSIONS_REQUIRED | User ID: ${req.user._id}`);
                return next();
            }

            const userPermissions = req.user.permissions || [];

            const hasPermission = requiredPermissions.every(permission => userPermissions.includes(permission));

            if (!hasPermission) {
                console.warn(`[AUTH_PERMISSION] INSUFFICIENT_PERMISSIONS | User ID: ${req.user._id} | User Permissions: ${userPermissions.join(', ')} | Required: ${requiredPermissions.join(', ')}`);
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: insufficient permissions',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    userPermissions: userPermissions,
                    requiredPermissions: requiredPermissions
                });
            }

            console.log(`[AUTH_PERMISSION] SUCCESS | User ID: ${req.user._id} | Permissions: ${userPermissions.join(', ')} | Duration: ${Date.now() - startTime}ms`);

            next();
        } catch (error) {
            console.error(`[AUTH_PERMISSION] ERROR | User ID: ${req.user?._id} | Error: ${error.message} | Duration: ${Date.now() - startTime}ms`);

            return res.status(500).json({
                success: false,
                message: 'Permission check failed',
                error: error.message,
                code: 'PERMISSION_ERROR'
            });
        }
    };
};

const authorizeProjectAccess = (accessLevelRequired = 'view') => {
    return async (req, res, next) => {
        const startTime = Date.now();
        const projectId = req.params.projectId || req.body.projectId;

        try {
            console.log(`[AUTH_PROJECT_ACCESS] START | User ID: ${req.user?._id} | Project ID: ${projectId} | Required Access: ${accessLevelRequired}`);

            if (!req.user) {
                console.warn(`[AUTH_PROJECT_ACCESS] NO_USER | User not authenticated`);
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized',
                    code: 'NOT_AUTHENTICATED'
                });
            }

            if (!projectId) {
                console.warn(`[AUTH_PROJECT_ACCESS] NO_PROJECT_ID | User ID: ${req.user._id}`);
                return res.status(400).json({
                    success: false,
                    message: 'Project ID is required',
                    code: 'PROJECT_ID_REQUIRED'
                });
            }

            const accessLevels = { view: 0, edit: 1, admin: 2 };
            const requiredLevel = accessLevels[accessLevelRequired] || 0;

            const projectAccess = await ProjectAccess.findOne({
                project: projectId,
                user: req.user._id,
                status: 'active'
            });

            if (!projectAccess) {
                console.warn(`[AUTH_PROJECT_ACCESS] NO_ACCESS | User ID: ${req.user._id} | Project ID: ${projectId}`);
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this project',
                    code: 'NO_PROJECT_ACCESS',
                    projectId: projectId
                });
            }

            if (!projectAccess.isValid()) {
                console.warn(`[AUTH_PROJECT_ACCESS] INVALID_ACCESS | User ID: ${req.user._id} | Project ID: ${projectId} | Status: ${projectAccess.status}`);
                return res.status(403).json({
                    success: false,
                    message: 'Your access to this project has expired or been revoked',
                    code: 'ACCESS_INVALID',
                    status: projectAccess.status
                });
            }

            const userAccessLevel = accessLevels[projectAccess.accessLevel] || 0;

            if (userAccessLevel < requiredLevel) {
                console.warn(`[AUTH_PROJECT_ACCESS] INSUFFICIENT_ACCESS | User ID: ${req.user._id} | Project ID: ${projectId} | User Level: ${projectAccess.accessLevel} | Required: ${accessLevelRequired}`);
                return res.status(403).json({
                    success: false,
                    message: `Insufficient access level. Required: ${accessLevelRequired}`,
                    code: 'INSUFFICIENT_ACCESS',
                    userAccessLevel: projectAccess.accessLevel,
                    requiredAccessLevel: accessLevelRequired
                });
            }

            await projectAccess.updateLastAccessed();

            console.log(`[AUTH_PROJECT_ACCESS] ACCESS_UPDATED | User ID: ${req.user._id} | Access Count: ${projectAccess.accessCount}`);

            req.projectAccess = projectAccess;

            console.log(`[AUTH_PROJECT_ACCESS] SUCCESS | User ID: ${req.user._id} | Project ID: ${projectId} | Access Level: ${projectAccess.accessLevel} | Duration: ${Date.now() - startTime}ms`);

            next();
        } catch (error) {
            console.error(`[AUTH_PROJECT_ACCESS] ERROR | User ID: ${req.user?._id} | Project ID: ${projectId} | Error: ${error.message} | Duration: ${Date.now() - startTime}ms`);

            return res.status(500).json({
                success: false,
                message: 'Project access check failed',
                error: error.message,
                code: 'PROJECT_ACCESS_ERROR'
            });
        }
    };
};

const refreshAccessToken = async (req, res, next) => {
    const startTime = Date.now();

    try {
        console.log(`[AUTH_REFRESH] START | IP: ${req.ip}`);

        let refreshToken;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            refreshToken = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.refreshToken) {
            refreshToken = req.cookies.refreshToken;
        } else if (req.body.refreshToken) {
            refreshToken = req.body.refreshToken;
        }

        if (!refreshToken) {
            console.warn(`[AUTH_REFRESH] NO_REFRESH_TOKEN | IP: ${req.ip}`);
            return res.status(401).json({
                success: false,
                message: 'Refresh token missing',
                code: 'REFRESH_TOKEN_MISSING'
            });
        }

        let decoded;

        try {
            decoded = verifyRefreshToken(refreshToken);
            console.log(`[AUTH_REFRESH] REFRESH_TOKEN_VERIFIED | User ID: ${decoded.id}`);
        } catch (tokenError) {
            console.warn(`[AUTH_REFRESH] INVALID_REFRESH_TOKEN | Error: ${tokenError.message}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }

        const user = await User.findById(decoded.id).select('-password -twoFactorSecret -backupCodes -emailVerificationToken -passwordResetToken');

        if (!user) {
            console.warn(`[AUTH_REFRESH] USER_NOT_FOUND | User ID: ${decoded.id}`);
            return res.status(401).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        if (!user.isActive || user.isDeleted || user.isSuspended) {
            console.warn(`[AUTH_REFRESH] USER_INVALID_STATE | User ID: ${user._id} | Active: ${user.isActive} | Deleted: ${user.isDeleted} | Suspended: ${user.isSuspended}`);
            return res.status(403).json({
                success: false,
                message: 'User account is not in valid state',
                code: 'USER_INVALID_STATE'
            });
        }

        const newAccessToken = generateAccessToken({
            id: user._id,
            email: user.email,
            role: user.role
        });

        console.log(`[AUTH_REFRESH] NEW_TOKEN_GENERATED | User ID: ${user._id}`);

        req.user = user;
        req.newAccessToken = newAccessToken;

        console.log(`[AUTH_REFRESH] SUCCESS | User ID: ${user._id} | Duration: ${Date.now() - startTime}ms`);

        next();
    } catch (error) {
        console.error(`[AUTH_REFRESH] ERROR | Error: ${error.message} | Duration: ${Date.now() - startTime}ms`);

        return res.status(500).json({
            success: false,
            message: 'Token refresh failed',
            error: error.message,
            code: 'REFRESH_ERROR'
        });
    }
};

module.exports = {
    protect,
    authorize,
    authorizePermission,
    authorizeProjectAccess,
    refreshAccessToken
};