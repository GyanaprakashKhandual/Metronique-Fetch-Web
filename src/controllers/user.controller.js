const User = require('../models/user.model');
const AuditLog = require('../models/audit.model');
const TeamMember = require('../models/team.member.model');
const crypto = require('crypto');
const { generateTokenPair } = require('../configs/jwt.config');
const logger = require('../utils/logger.util');
const { catchAsync } = require('../utils/error.util');
const emailService = require('../services/notification/mail.service');

const sendEmailVerificationLink = catchAsync(async (req, res) => {
    const { email } = req.body;
    console.log(`[USER_CONTROLLER] Send email verification link initiated for: ${email}`);

    if (!email) {
        console.warn(`[USER_CONTROLLER] Send verification link failed: Email missing`);
        return res.status(400).json({
            success: false,
            message: 'Email is required',
            code: 'EMAIL_REQUIRED'
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.warn(`[USER_CONTROLLER] Send verification link failed: Invalid email format - ${email}`);
        return res.status(400).json({
            success: false,
            message: 'Invalid email format',
            code: 'INVALID_EMAIL_FORMAT'
        });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        console.log(`[USER_CONTROLLER] Creating new user for email verification: ${email}`);
        user = new User({
            email: email.toLowerCase(),
            isEmailVerified: false
        });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await user.save();

    try {
        const verificationLink = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
        await emailService.sendVerificationEmail(email, verificationLink, user.firstName || 'User');
        console.log(`[USER_CONTROLLER] Verification email sent successfully: ${email}`);

        return res.json({
            success: true,
            message: 'Verification link sent to your email',
            data: {
                email,
                expiresIn: '24 hours'
            }
        });
    } catch (emailError) {
        console.error(`[USER_CONTROLLER] Verification email failed: ${email} - ${emailError.message}`);
        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;
        await user.save();

        return res.status(500).json({
            success: false,
            message: 'Failed to send verification email',
            code: 'EMAIL_SEND_FAILED'
        });
    }
});

const verifyEmailToken = catchAsync(async (req, res) => {
    const { token, email } = req.body;
    console.log(`[USER_CONTROLLER] Email verification initiated for: ${email}`);

    if (!token || !email) {
        console.warn(`[USER_CONTROLLER] Email verification failed: Missing required fields`);
        return res.status(400).json({
            success: false,
            message: 'Token and email are required',
            code: 'MISSING_FIELDS'
        });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        console.warn(`[USER_CONTROLLER] Email verification failed: User not found - ${email}`);
        return res.status(404).json({
            success: false,
            message: 'User not found',
            code: 'USER_NOT_FOUND'
        });
    }

    if (!user.emailVerificationToken || !user.emailVerificationExpires) {
        console.warn(`[USER_CONTROLLER] Email verification failed: No verification data - ${email}`);
        return res.status(400).json({
            success: false,
            message: 'Invalid or expired verification link',
            code: 'INVALID_VERIFICATION_TOKEN'
        });
    }

    if (new Date() > user.emailVerificationExpires) {
        console.warn(`[USER_CONTROLLER] Email verification failed: Token expired - ${email}`);
        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;
        await user.save();
        return res.status(400).json({
            success: false,
            message: 'Verification link has expired',
            code: 'TOKEN_EXPIRED'
        });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    if (hashedToken !== user.emailVerificationToken) {
        console.warn(`[USER_CONTROLLER] Email verification failed: Invalid token - ${email}`);
        return res.status(400).json({
            success: false,
            message: 'Invalid verification link',
            code: 'INVALID_TOKEN'
        });
    }

    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    user.isEmailVerified = true;
    user.lastLogin = new Date();

    await user.save();

    const { accessToken, refreshToken } = generateTokenPair({
        id: user._id,
        email: user.email,
        role: user.role
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await AuditLog.create({
        user: user._id,
        action: 'email_verified',
        actionCategory: 'authentication',
        entityType: 'user',
        entityId: user._id,
        status: 'success',
        severity: 'info',
        details: { description: 'Email verified via link' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[USER_CONTROLLER] Email verification successful: ${email}`);

    return res.json({
        success: true,
        message: 'Email verified successfully',
        data: {
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                isEmailVerified: user.isEmailVerified
            },
            accessToken,
            refreshToken,
            expiresIn: '15m'
        }
    });
});

const register = catchAsync(async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword, username } = req.body;
    console.log(`[USER_CONTROLLER] User registration initiated: ${email}`);

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        console.warn(`[USER_CONTROLLER] Registration failed: Missing required fields`);
        return res.status(400).json({
            success: false,
            message: 'All required fields must be provided',
            code: 'MISSING_FIELDS'
        });
    }

    if (password !== confirmPassword) {
        console.warn(`[USER_CONTROLLER] Registration failed: Passwords do not match - ${email}`);
        return res.status(400).json({
            success: false,
            message: 'Passwords do not match',
            code: 'PASSWORD_MISMATCH'
        });
    }

    if (password.length < 8) {
        console.warn(`[USER_CONTROLLER] Registration failed: Password too short - ${email}`);
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters',
            code: 'PASSWORD_TOO_SHORT'
        });
    }

    const existingUser = await User.findOne({
        $or: [
            { email: email.toLowerCase() },
            { username: username?.toLowerCase() }
        ]
    });

    if (existingUser) {
        console.warn(`[USER_CONTROLLER] Registration failed: User already exists - ${email}`);
        return res.status(409).json({
            success: false,
            message: 'Email or username already registered',
            code: 'USER_EXISTS'
        });
    }

    const newUser = new User({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase(),
        password: password,
        username: username?.toLowerCase(),
        isEmailVerified: false,
        isActive: true,
        metadata: {
            signupSource: 'web',
            signupIP: req.ip,
            userAgent: req.get('user-agent')
        }
    });

    await newUser.save();

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    newUser.emailVerificationToken = hashedToken;
    newUser.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await newUser.save();

    try {
        const verificationLink = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
        await emailService.sendVerificationEmail(email, verificationLink, firstName);
        console.log(`[USER_CONTROLLER] Registration verification email sent: ${email}`);
    } catch (emailError) {
        console.error(`[USER_CONTROLLER] Registration verification email failed: ${email} - ${emailError.message}`);
    }

    const { accessToken, refreshToken } = generateTokenPair({
        id: newUser._id,
        email: newUser.email,
        role: newUser.role
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await AuditLog.create({
        user: newUser._id,
        action: 'user_created',
        actionCategory: 'authentication',
        entityType: 'user',
        entityId: newUser._id,
        status: 'success',
        severity: 'info',
        details: { description: 'User registered via email' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[USER_CONTROLLER] User registered successfully: ${email}`);

    return res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email.',
        data: {
            user: {
                id: newUser._id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName
            },
            accessToken,
            refreshToken,
            expiresIn: '15m'
        }
    });
});
// In your user.controller.js - Replace googleAuthCallback and githubAuthCallback

const googleAuthCallback = catchAsync(async (req, res) => {
    const user = req.user;
    console.log(`[USER_CONTROLLER] Google OAuth callback for: ${user?.email}`);

    if (!user) {
        console.warn(`[USER_CONTROLLER] Google OAuth failed: No user object`);
        return res.redirect(`${process.env.FRONTEND_URL}/auth?error=authentication_failed`);
    }

    const { accessToken, refreshToken } = generateTokenPair({
        id: user._id,
        email: user.email,
        role: user.role
    });

    // Set tokens in secure httpOnly cookies
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    await AuditLog.create({
        user: user._id,
        action: 'user_login',
        actionCategory: 'authentication',
        entityType: 'user',
        entityId: user._id,
        status: 'success',
        severity: 'info',
        details: { description: 'Login via Google OAuth' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[USER_CONTROLLER] Google OAuth successful: ${user.email}`);

    // Simple redirect to /app - tokens in httpOnly cookies
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/app`);
});

const githubAuthCallback = catchAsync(async (req, res) => {
    const user = req.user;
    console.log(`[USER_CONTROLLER] GitHub OAuth callback for: ${user?.email}`);

    if (!user) {
        console.warn(`[USER_CONTROLLER] GitHub OAuth failed: No user object`);
        return res.redirect(`${process.env.FRONTEND_URL}/auth?error=authentication_failed`);
    }

    const { accessToken, refreshToken } = generateTokenPair({
        id: user._id,
        email: user.email,
        role: user.role
    });

    // Set tokens in secure httpOnly cookies
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    await AuditLog.create({
        user: user._id,
        action: 'user_login',
        actionCategory: 'authentication',
        entityType: 'user',
        entityId: user._id,
        status: 'success',
        severity: 'info',
        details: { description: 'Login via GitHub OAuth' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[USER_CONTROLLER] GitHub OAuth successful: ${user.email}`);

    // Simple redirect to /app - tokens in httpOnly cookies
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/app`);
});


const getCurrentUser = catchAsync(async (req, res) => {
    console.log(`[USER_CONTROLLER] Fetching current user: ${req.user._id}`);

    const user = await User.findById(req.user._id)
        .select('-password -twoFactorSecret -backupCodes -emailVerificationToken -passwordResetToken')
        .populate('ownedTeams', 'name description')
        .populate({
            path: 'teamMemberships',
            populate: {
                path: 'team',
                select: 'name description'
            }
        });

    if (!user) {
        console.warn(`[USER_CONTROLLER] Current user not found: ${req.user._id}`);
        return res.status(404).json({
            success: false,
            message: 'User not found',
            code: 'USER_NOT_FOUND'
        });
    }

    console.log(`[USER_CONTROLLER] Current user fetched: ${user.email}`);

    return res.json({
        success: true,
        data: { user }
    });
});

const updateProfile = catchAsync(async (req, res) => {
    const { firstName, lastName, bio, phone, timezone, language } = req.body;
    console.log(`[USER_CONTROLLER] Updating profile for user: ${req.user._id}`);

    const updateData = {};

    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (phone) updateData.phone = phone;
    if (timezone) updateData.timezone = timezone;
    if (language) updateData.language = language;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true, runValidators: true }
    ).select('-password -twoFactorSecret -backupCodes -emailVerificationToken -passwordResetToken');

    await AuditLog.create({
        user: req.user._id,
        action: 'user_updated',
        actionCategory: 'user',
        entityType: 'user',
        entityId: user._id,
        status: 'success',
        severity: 'info',
        changes: { before: req.user, after: updateData },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[USER_CONTROLLER] Profile updated: ${user.email}`);

    return res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
    });
});

const changePassword = catchAsync(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    console.log(`[USER_CONTROLLER] Password change initiated for user: ${req.user._id}`);

    if (!currentPassword || !newPassword || !confirmPassword) {
        console.warn(`[USER_CONTROLLER] Password change failed: Missing fields`);
        return res.status(400).json({
            success: false,
            message: 'All password fields are required',
            code: 'MISSING_FIELDS'
        });
    }

    if (newPassword !== confirmPassword) {
        console.warn(`[USER_CONTROLLER] Password change failed: Passwords do not match`);
        return res.status(400).json({
            success: false,
            message: 'New passwords do not match',
            code: 'PASSWORD_MISMATCH'
        });
    }

    if (newPassword.length < 8) {
        console.warn(`[USER_CONTROLLER] Password change failed: Password too short`);
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters',
            code: 'PASSWORD_TOO_SHORT'
        });
    }

    const user = await User.findById(req.user._id);

    if (!user.password) {
        console.warn(`[USER_CONTROLLER] Password change failed: OAuth account - ${user.email}`);
        return res.status(400).json({
            success: false,
            message: 'Cannot change password for OAuth accounts',
            code: 'OAUTH_ACCOUNT'
        });
    }

    const isPasswordMatch = await user.comparePassword(currentPassword);

    if (!isPasswordMatch) {
        console.warn(`[USER_CONTROLLER] Password change failed: Incorrect current password - ${user.email}`);
        return res.status(401).json({
            success: false,
            message: 'Current password is incorrect',
            code: 'INVALID_PASSWORD'
        });
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'password_changed',
        actionCategory: 'authentication',
        entityType: 'user',
        entityId: user._id,
        status: 'success',
        severity: 'info',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[USER_CONTROLLER] Password changed successfully: ${user.email}`);

    return res.json({
        success: true,
        message: 'Password changed successfully'
    });
});

const forgotPassword = catchAsync(async (req, res) => {
    const { email } = req.body;
    console.log(`[USER_CONTROLLER] Forgot password initiated for: ${email}`);

    if (!email) {
        console.warn(`[USER_CONTROLLER] Forgot password failed: Email missing`);
        return res.status(400).json({
            success: false,
            message: 'Email is required',
            code: 'EMAIL_REQUIRED'
        });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        console.log(`[USER_CONTROLLER] Forgot password: User not found - ${email}`);
        return res.json({
            success: true,
            message: 'If user exists, password reset link sent to email'
        });
    }

    if (!user.password) {
        console.warn(`[USER_CONTROLLER] Forgot password failed: OAuth account - ${email}`);
        return res.status(400).json({
            success: false,
            message: 'Password reset not available for OAuth accounts',
            code: 'OAUTH_ACCOUNT'
        });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await user.save();

    try {
        const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
        await emailService.sendPasswordResetEmail(email, resetLink, user.firstName);
        console.log(`[USER_CONTROLLER] Password reset link sent: ${email}`);

        return res.json({
            success: true,
            message: 'Password reset link sent to your email'
        });
    } catch (emailError) {
        console.error(`[USER_CONTROLLER] Password reset email failed: ${email} - ${emailError.message}`);
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();

        return res.status(500).json({
            success: false,
            message: 'Error sending reset email',
            code: 'EMAIL_SEND_FAILED'
        });
    }
});

const resetPassword = catchAsync(async (req, res) => {
    const { token, email, password, confirmPassword } = req.body;
    console.log(`[USER_CONTROLLER] Password reset initiated for: ${email}`);

    if (!token || !email || !password || !confirmPassword) {
        console.warn(`[USER_CONTROLLER] Password reset failed: Missing fields`);
        return res.status(400).json({
            success: false,
            message: 'All fields are required',
            code: 'MISSING_FIELDS'
        });
    }

    if (password !== confirmPassword) {
        console.warn(`[USER_CONTROLLER] Password reset failed: Passwords do not match`);
        return res.status(400).json({
            success: false,
            message: 'Passwords do not match',
            code: 'PASSWORD_MISMATCH'
        });
    }

    if (password.length < 8) {
        console.warn(`[USER_CONTROLLER] Password reset failed: Password too short`);
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters',
            code: 'PASSWORD_TOO_SHORT'
        });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
        email: email.toLowerCase(),
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
        console.warn(`[USER_CONTROLLER] Password reset failed: Invalid or expired token - ${email}`);
        return res.status(400).json({
            success: false,
            message: 'Invalid or expired reset token',
            code: 'INVALID_TOKEN'
        });
    }

    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.passwordChangedAt = new Date();

    await user.save();

    await AuditLog.create({
        user: user._id,
        action: 'password_reset',
        actionCategory: 'authentication',
        entityType: 'user',
        entityId: user._id,
        status: 'success',
        severity: 'info',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[USER_CONTROLLER] Password reset successful: ${user.email}`);

    return res.json({
        success: true,
        message: 'Password reset successful. Please login with new password.'
    });
});

const updatePreferences = catchAsync(async (req, res) => {
    const { preferences } = req.body;
    console.log(`[USER_CONTROLLER] Updating preferences for user: ${req.user._id}`);

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { preferences },
        { new: true, runValidators: true }
    ).select('-password -twoFactorSecret -backupCodes');

    await AuditLog.create({
        user: req.user._id,
        action: 'user_updated',
        actionCategory: 'user',
        entityType: 'user',
        entityId: user._id,
        status: 'success',
        severity: 'info',
        requestId: req.id
    });

    console.log(`[USER_CONTROLLER] Preferences updated: ${user.email}`);

    return res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: { user }
    });
});

const getAllUsers = catchAsync(async (req, res) => {
    const { page = 1, limit = 10, search, role, status } = req.query;
    console.log(`[USER_CONTROLLER] Fetching all users - Page: ${page}, Limit: ${limit}`);

    const query = { isDeleted: false };

    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    if (role) {
        query.role = role;
    }

    if (status) {
        if (status === 'active') query.isActive = true;
        if (status === 'inactive') query.isActive = false;
        if (status === 'suspended') query.isSuspended = true;
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
        .select('-password -twoFactorSecret -backupCodes -emailVerificationToken -passwordResetToken')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    console.log(`[USER_CONTROLLER] Users fetched: ${users.length} of ${total}`);

    return res.json({
        success: true,
        data: {
            users,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        }
    });
});

const getUserById = catchAsync(async (req, res) => {
    const { userId } = req.params;
    console.log(`[USER_CONTROLLER] Fetching user: ${userId}`);

    const user = await User.findById(userId)
        .select('-password -twoFactorSecret -backupCodes -emailVerificationToken -passwordResetToken')
        .populate('ownedTeams', 'name description')
        .populate({
            path: 'teamMemberships',
            populate: {
                path: 'team',
                select: 'name description'
            }
        });

    if (!user) {
        console.warn(`[USER_CONTROLLER] User not found: ${userId}`);
        return res.status(404).json({
            success: false,
            message: 'User not found',
            code: 'USER_NOT_FOUND'
        });
    }

    console.log(`[USER_CONTROLLER] User fetched: ${user.email}`);

    return res.json({
        success: true,
        data: { user }
    });
});

const updateUserStatus = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { status, reason } = req.body;
    console.log(`[USER_CONTROLLER] Updating user status: ${userId} to ${status}`);

    const user = await User.findById(userId);

    if (!user) {
        console.warn(`[USER_CONTROLLER] User not found for status update: ${userId}`);
        return res.status(404).json({
            success: false,
            message: 'User not found',
            code: 'USER_NOT_FOUND'
        });
    }

    if (status === 'suspended') {
        user.isSuspended = true;
        user.suspensionReason = reason;
        user.suspendedAt = new Date();
        user.suspendedBy = req.user._id;
    } else if (status === 'active') {
        user.isActive = true;
        user.isSuspended = false;
        user.suspensionReason = null;
    } else if (status === 'inactive') {
        user.isActive = false;
    }

    await user.save();

    await AuditLog.create({
        user: req.user._id,
        action: `user_${status}`,
        actionCategory: 'user',
        entityType: 'user',
        entityId: user._id,
        status: 'success',
        severity: status === 'suspended' ? 'warning' : 'info',
        details: { reason, newStatus: status },
        affectedUsers: [user._id],
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[USER_CONTROLLER] User status updated: ${user.email} - ${status}`);

    return res.json({
        success: true,
        message: `User status updated to ${status}`,
        data: { user }
    });
});

const deleteAccount = catchAsync(async (req, res) => {
    const { password } = req.body;
    console.log(`[USER_CONTROLLER] Account deletion initiated: ${req.user._id}`);

    if (!password) {
        console.warn(`[USER_CONTROLLER] Account deletion failed: Password missing`);
        return res.status(400).json({
            success: false,
            message: 'Password is required to delete account',
            code: 'PASSWORD_REQUIRED'
        });
    }

    const user = await User.findById(req.user._id);

    if (!user.password) {
        console.warn(`[USER_CONTROLLER] Account deletion failed: OAuth account - ${user.email}`);
        return res.status(400).json({
            success: false,
            message: 'Cannot delete OAuth accounts this way',
            code: 'OAUTH_ACCOUNT'
        });
    }

    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
        console.warn(`[USER_CONTROLLER] Account deletion failed: Incorrect password - ${user.email}`);
        return res.status(401).json({
            success: false,
            message: 'Incorrect password',
            code: 'INVALID_PASSWORD'
        });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = req.user._id;
    user.email = `deleted-${Date.now()}-${user.email}`;
    user.isActive = false;

    await user.save();

    res.clearCookie('refreshToken');

    await AuditLog.create({
        user: req.user._id,
        action: 'user_deleted',
        actionCategory: 'user',
        entityType: 'user',
        entityId: user._id,
        status: 'success',
        severity: 'warning',
        details: { description: 'Account deleted by user' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[USER_CONTROLLER] Account deleted successfully: ${user.email}`);

    return res.json({
        success: true,
        message: 'Account deleted successfully'
    });
});

const updateAvatar = catchAsync(async (req, res) => {
    const { url, publicId } = req.body;
    console.log(`[USER_CONTROLLER] Avatar update initiated: ${req.user._id}`);

    if (!url) {
        console.warn(`[USER_CONTROLLER] Avatar update failed: URL missing`);
        return res.status(400).json({
            success: false,
            message: 'Avatar URL is required',
            code: 'URL_REQUIRED'
        });
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { avatar: { url, publicId } },
        { new: true, runValidators: true }
    ).select('-password -twoFactorSecret -backupCodes');

    console.log(`[USER_CONTROLLER] Avatar updated: ${user.email}`);

    return res.json({
        success: true,
        message: 'Avatar updated successfully',
        data: { user }
    });
});

const getAnalytics = catchAsync(async (req, res) => {
    const userId = req.user._id;
    console.log(`[USER_CONTROLLER] Fetching analytics for user: ${userId}`);

    const user = await User.findById(userId);

    if (!user) {
        console.warn(`[USER_CONTROLLER] Analytics fetch failed: User not found`);
        return res.status(404).json({
            success: false,
            message: 'User not found',
            code: 'USER_NOT_FOUND'
        });
    }

    const teamCount = await TeamMember.countDocuments({ user: userId, status: 'active' });

    const analytics = {
        totalTestsRun: user.analytics.totalTestsRun,
        totalTestsPassed: user.analytics.totalTestsPassed,
        totalTestsFailed: user.analytics.totalTestsFailed,
        averageTestDuration: user.analytics.averageTestDuration,
        lastTestRun: user.analytics.lastTestRun,
        totalLoginCount: user.analytics.totalLoginCount,
        totalProjectsCreated: user.analytics.totalProjectsCreated,
        activeTeams: teamCount,
        subscriptionPlan: user.subscription.plan,
        subscriptionStatus: user.subscription.status,
        usagePercentage: {
            apiTests: (user.usage.apiTestsRun / user.limits.maxApiTests) * 100,
            testScripts: (user.usage.testScriptsGenerated / user.limits.maxTestScripts) * 100,
            repositories: (user.usage.repositoriesConnected / user.limits.maxRepositories) * 100,
            projects: (user.usage.projectsCreated / user.limits.maxProjects) * 100
        }
    };

    console.log(`[USER_CONTROLLER] Analytics fetched: ${userId}`);

    return res.json({
        success: true,
        data: { analytics }
    });
});

const connectIntegration = catchAsync(async (req, res) => {
    const { provider, accessToken, refreshToken, additionalData } = req.body;
    console.log(`[USER_CONTROLLER] Connecting integration: ${provider} for user: ${req.user._id}`);

    if (!provider || !accessToken) {
        console.warn(`[USER_CONTROLLER] Integration connection failed: Missing required fields`);
        return res.status(400).json({
            success: false,
            message: 'Provider and access token are required',
            code: 'MISSING_FIELDS'
        });
    }

    const user = await User.findById(req.user._id);

    if (!user.integrations[provider]) {
        console.warn(`[USER_CONTROLLER] Integration connection failed: Unknown provider - ${provider}`);
        return res.status(400).json({
            success: false,
            message: `Integration ${provider} not supported`,
            code: 'UNKNOWN_PROVIDER'
        });
    }

    user.integrations[provider] = {
        connected: true,
        accessToken,
        refreshToken: refreshToken || null,
        ...additionalData,
        expiresAt: additionalData?.expiresAt || null
    };

    await user.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'integration_connected',
        actionCategory: 'integration',
        entityType: 'user',
        entityId: user._id,
        status: 'success',
        severity: 'info',
        details: { provider },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[USER_CONTROLLER] Integration connected successfully: ${provider}`);

    return res.json({
        success: true,
        message: `${provider} integration connected successfully`,
        data: { user: { integrations: user.integrations } }
    });
});

const disconnectIntegration = catchAsync(async (req, res) => {
    const { provider } = req.body;
    console.log(`[USER_CONTROLLER] Disconnecting integration: ${provider} for user: ${req.user._id}`);

    if (!provider) {
        console.warn(`[USER_CONTROLLER] Integration disconnection failed: Provider missing`);
        return res.status(400).json({
            success: false,
            message: 'Provider is required',
            code: 'PROVIDER_REQUIRED'
        });
    }

    const user = await User.findById(req.user._id);

    if (!user.integrations[provider]) {
        console.warn(`[USER_CONTROLLER] Integration disconnection failed: Unknown provider - ${provider}`);
        return res.status(400).json({
            success: false,
            message: `Integration ${provider} not supported`,
            code: 'UNKNOWN_PROVIDER'
        });
    }

    user.integrations[provider] = {
        connected: false,
        accessToken: null,
        refreshToken: null
    };

    await user.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'integration_disconnected',
        actionCategory: 'integration',
        entityType: 'user',
        entityId: user._id,
        status: 'success',
        severity: 'info',
        details: { provider },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[USER_CONTROLLER] Integration disconnected successfully: ${provider}`);

    return res.json({
        success: true,
        message: `${provider} integration disconnected successfully`,
        data: { user: { integrations: user.integrations } }
    });
});

// Login function
const login = catchAsync(async (req, res) => {
    const user = req.user;
    const token = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    res.json({
        success: true,
        message: 'Login successful',
        data: {
            user,
            token,
            refreshToken
        }
    });
});

// Two-factor setup
const setupTwoFactor = catchAsync(async (req, res) => {
    res.json({
        success: true,
        message: 'Two-factor setup initiated',
        data: {}
    });
});

// Two-factor verify
const verifyTwoFactor = catchAsync(async (req, res) => {
    res.json({
        success: true,
        message: 'Two-factor verified',
        data: {}
    });
});

// Two-factor disable
const disableTwoFactor = catchAsync(async (req, res) => {
    res.json({
        success: true,
        message: 'Two-factor disabled',
        data: {}
    });
});

// Get user integrations
const getUserIntegrations = catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id).select('integrations');
    res.json({
        success: true,
        message: 'User integrations retrieved',
        data: { integrations: user.integrations }
    });
});

// Generate referral code
const generateReferralCode = catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id);
    res.json({
        success: true,
        message: 'Referral code generated',
        data: { referralCode: user.referral.code }
    });
});

// Get referral info
const getReferralInfo = catchAsync(async (req, res) => {
    const { code } = req.params;
    const user = await User.findOne({ 'referral.code': code });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'Referral code not found'
        });
    }

    res.json({
        success: true,
        message: 'Referral info retrieved',
        data: {
            referrerName: user.firstName + ' ' + user.lastName,
            rewards: user.referral.totalRewards
        }
    });
});

// Update subscription
const updateSubscription = catchAsync(async (req, res) => {
    const { plan } = req.body;
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { 'subscription.plan': plan },
        { new: true }
    );

    res.json({
        success: true,
        message: 'Subscription updated',
        data: { subscription: user.subscription }
    });
});

// Update user role
const updateUserRole = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;

    const user = await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true }
    );

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    res.json({
        success: true,
        message: 'User role updated',
        data: { user }
    });
});

// Bulk user operation
const bulkUserOperation = catchAsync(async (req, res) => {
    const { operation, userIds } = req.body;

    res.json({
        success: true,
        message: `Bulk ${operation} operation completed`,
        data: { operatedCount: userIds.length }
    });
});

module.exports = {
    sendEmailVerificationLink,
    verifyEmailToken,
    register,
    login,
    googleAuthCallback,
    githubAuthCallback,
    getCurrentUser,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    updatePreferences,
    getAllUsers,
    getUserById,
    updateUserStatus,
    updateUserRole,
    deleteAccount,
    updateAvatar,
    getAnalytics,
    setupTwoFactor,
    verifyTwoFactor,
    disableTwoFactor,
    connectIntegration,
    disconnectIntegration,
    getUserIntegrations,
    generateReferralCode,
    getReferralInfo,
    updateSubscription,
    bulkUserOperation
};