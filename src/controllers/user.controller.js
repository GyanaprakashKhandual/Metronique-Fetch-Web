const User = require('../models/user.model');
const AuditLog = require('../models/audit.model');
const Team = require('../models/team.model')
const crypto = require('crypto');
const { generateTokenPair } = require('../configs/jwt.config');
const { catchAsync } = require('../utils/error.util');
const emailService = require('../services/notification/mail.service');

const sendEmailVerificationLink = catchAsync(async (req, res) => {
    const { email } = req.body;
    console.log(`[AUTH] Email verification requested: ${email}`);

    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Email is required',
            code: 'EMAIL_REQUIRED'
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid email format',
            code: 'INVALID_EMAIL_FORMAT'
        });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        console.log(`[AUTH] Creating new user: ${email}`);
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
        const verificationLink = `${process.env.FRONTEND_URL}/auth/verify-email`;
        await emailService.sendVerificationEmail(email, verificationLink, user.firstName || 'User');
        console.log(`[AUTH] Verification email sent: ${email}`);

        return res.json({
            success: true,
            message: 'Verification link sent to your email',
            data: {
                email,
                expiresIn: '24 hours'
            }
        });
    } catch (emailError) {
        console.error(`[AUTH] Email send failed: ${email}`, emailError);
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
    console.log(`[AUTH] Email verification attempt: ${email}`);
    console.log(`[AUTH] Token received from frontend: ${token}`);
    console.log(`[AUTH] Token length: ${token?.length}`);

    if (!token || !email) {
        return res.status(400).json({
            success: false,
            message: 'Token and email are required',
            code: 'MISSING_FIELDS'
        });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            code: 'USER_NOT_FOUND'
        });
    }

    console.log(`[AUTH] User found: ${user.email}`);
    console.log(`[AUTH] Stored token hash: ${user.emailVerificationToken}`);
    console.log(`[AUTH] Stored token hash length: ${user.emailVerificationToken?.length}`);

    if (!user.emailVerificationToken || !user.emailVerificationExpires) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or expired verification link',
            code: 'INVALID_VERIFICATION_TOKEN'
        });
    }

    if (new Date() > user.emailVerificationExpires) {
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
    console.log(`[AUTH] Computed hash from token: ${hashedToken}`);
    console.log(`[AUTH] Hashes match: ${hashedToken === user.emailVerificationToken}`);

    if (hashedToken !== user.emailVerificationToken) {
        console.error(`[AUTH] Token mismatch!`);
        console.error(`[AUTH] Expected: ${user.emailVerificationToken}`);
        console.error(`[AUTH] Got:      ${hashedToken}`);
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

    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000
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

    console.log(`[AUTH] Email verified successfully: ${email}`);

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
            }
        }
    });
});

const register = catchAsync(async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword, username } = req.body;
    console.log(`[AUTH] Registration attempt: ${email}`);

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        return res.status(400).json({
            success: false,
            message: 'All required fields must be provided',
            code: 'MISSING_FIELDS'
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({
            success: false,
            message: 'Passwords do not match',
            code: 'PASSWORD_MISMATCH'
        });
    }

    if (password.length < 8) {
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
        const verificationLink = `${process.env.FRONTEND_URL}/auth/verify-email`;
        await emailService.sendVerificationEmail(email, verificationLink, firstName);
        console.log(`[AUTH] Verification email sent to new user: ${email}`);
    } catch (emailError) {
        console.error(`[AUTH] Failed to send verification email: ${email}`, emailError);
    }

    const { accessToken, refreshToken } = generateTokenPair({
        id: newUser._id,
        email: newUser.email,
        role: newUser.role
    });

    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000
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

    console.log(`[AUTH] User registered successfully: ${email}`);

    return res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email.',
        data: {
            user: {
                id: newUser._id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName
            }
        }
    });
});

const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    console.log(`[AUTH] Login attempt: ${email}`);

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required',
            code: 'MISSING_FIELDS'
        });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS'
        });
    }

    if (!user.password) {
        return res.status(400).json({
            success: false,
            message: 'Please login with your OAuth provider',
            code: 'OAUTH_ACCOUNT'
        });
    }

    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS'
        });
    }

    if (!user.isActive) {
        return res.status(403).json({
            success: false,
            message: 'Account is inactive',
            code: 'ACCOUNT_INACTIVE'
        });
    }

    if (user.isSuspended) {
        return res.status(403).json({
            success: false,
            message: 'Account is suspended',
            code: 'ACCOUNT_SUSPENDED'
        });
    }

    user.lastLogin = new Date();
    await user.save();

    const { accessToken, refreshToken } = generateTokenPair({
        id: user._id,
        email: user.email,
        role: user.role
    });

    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await AuditLog.create({
        user: user._id,
        action: 'user_login',
        actionCategory: 'authentication',
        entityType: 'user',
        entityId: user._id,
        status: 'success',
        severity: 'info',
        details: { description: 'Login via email/password' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[AUTH] Login successful: ${email}`);

    return res.json({
        success: true,
        message: 'Login successful',
        data: {
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                role: user.role,
                isEmailVerified: user.isEmailVerified
            }
        }
    });
});

const googleAuthCallback = catchAsync(async (req, res) => {
    const user = req.user;
    console.log(`[AUTH] Google OAuth callback: ${user?.email}`);

    if (!user) {
        console.warn(`[AUTH] Google OAuth failed: No user object`);
        return res.redirect(`${process.env.FRONTEND_URL}/auth?error=authentication_failed`);
    }

    const { accessToken, refreshToken } = generateTokenPair({
        id: user._id,
        email: user.email,
        role: user.role
    });

    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
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

    console.log(`[AUTH] Google OAuth successful: ${user.email}`);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/app`);
});

const githubAuthCallback = catchAsync(async (req, res) => {
    const user = req.user;
    console.log(`[AUTH] GitHub OAuth callback: ${user?.email}`);

    if (!user) {
        console.warn(`[AUTH] GitHub OAuth failed: No user object`);
        return res.redirect(`${process.env.FRONTEND_URL}/auth?error=authentication_failed`);
    }

    const { accessToken, refreshToken } = generateTokenPair({
        id: user._id,
        email: user.email,
        role: user.role
    });

    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
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

    console.log(`[AUTH] GitHub OAuth successful: ${user.email}`);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/app`);
});

const logout = catchAsync(async (req, res) => {
    console.log(`[AUTH] Logout initiated: ${req.user?.email || 'Unknown'}`);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    if (req.user?._id) {
        await AuditLog.create({
            user: req.user._id,
            action: 'user_logout',
            actionCategory: 'authentication',
            entityType: 'user',
            entityId: req.user._id,
            status: 'success',
            severity: 'info',
            details: { description: 'User logged out' },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        });
    }

    console.log(`[AUTH] Logout successful`);

    return res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

const refreshAccessToken = catchAsync(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    console.log(`[AUTH] Access token refresh requested`);

    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            message: 'Refresh token required',
            code: 'REFRESH_TOKEN_REQUIRED'
        });
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }

        const { accessToken, refreshToken: newRefreshToken } = generateTokenPair({
            id: user._id,
            email: user.email,
            role: user.role
        });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        console.log(`[AUTH] Access token refreshed: ${user.email}`);

        return res.json({
            success: true,
            message: 'Token refreshed successfully'
        });
    } catch (error) {
        console.error(`[AUTH] Token refresh failed:`, error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired refresh token',
            code: 'INVALID_REFRESH_TOKEN'
        });
    }
});

const getCurrentUser = catchAsync(async (req, res) => {
    console.log(`[USER] Fetching current user: ${req.user._id}`);

    const user = await User.findById(req.user._id)
        .select('-password -twoFactorSecret -backupCodes -emailVerificationToken -passwordResetToken');

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            code: 'USER_NOT_FOUND'
        });
    }

    console.log(`[USER] Current user fetched: ${user.email}`);

    return res.json({
        success: true,
        data: { user }
    });
});

const updateProfile = catchAsync(async (req, res) => {
    const { firstName, lastName, bio, phone, timezone, language } = req.body;
    console.log(`[USER] Updating profile: ${req.user._id}`);

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

    console.log(`[USER] Profile updated: ${user.email}`);

    return res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
    });
});

const changePassword = catchAsync(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    console.log(`[USER] Password change initiated: ${req.user._id}`);

    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
            success: false,
            message: 'All password fields are required',
            code: 'MISSING_FIELDS'
        });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({
            success: false,
            message: 'New passwords do not match',
            code: 'PASSWORD_MISMATCH'
        });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters',
            code: 'PASSWORD_TOO_SHORT'
        });
    }

    const user = await User.findById(req.user._id);

    if (!user.password) {
        return res.status(400).json({
            success: false,
            message: 'Cannot change password for OAuth accounts',
            code: 'OAUTH_ACCOUNT'
        });
    }

    const isPasswordMatch = await user.comparePassword(currentPassword);

    if (!isPasswordMatch) {
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

    console.log(`[USER] Password changed: ${user.email}`);

    return res.json({
        success: true,
        message: 'Password changed successfully'
    });
});

const forgotPassword = catchAsync(async (req, res) => {
    const { email } = req.body;
    console.log(`[AUTH] Password reset requested: ${email}`);

    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Email is required',
            code: 'EMAIL_REQUIRED'
        });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        return res.json({
            success: true,
            message: 'If user exists, password reset link sent to email'
        });
    }

    if (!user.password) {
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
        console.log(`[AUTH] Password reset link sent: ${email}`);

        return res.json({
            success: true,
            message: 'Password reset link sent to your email'
        });
    } catch (emailError) {
        console.error(`[AUTH] Password reset email failed: ${email}`, emailError);
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
    console.log(`[AUTH] Password reset attempt: ${email}`);

    if (!token || !email || !password || !confirmPassword) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required',
            code: 'MISSING_FIELDS'
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({
            success: false,
            message: 'Passwords do not match',
            code: 'PASSWORD_MISMATCH'
        });
    }

    if (password.length < 8) {
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

    console.log(`[AUTH] Password reset successful: ${user.email}`);

    return res.json({
        success: true,
        message: 'Password reset successful. Please login with new password.'
    });
});

const deleteAccount = catchAsync(async (req, res) => {
    const { password } = req.body;
    console.log(`[USER] Account deletion initiated: ${req.user._id}`);

    if (!password) {
        return res.status(400).json({
            success: false,
            message: 'Password is required to delete account',
            code: 'PASSWORD_REQUIRED'
        });
    }

    const user = await User.findById(req.user._id);

    if (!user.password) {
        return res.status(400).json({
            success: false,
            message: 'Cannot delete OAuth accounts this way',
            code: 'OAUTH_ACCOUNT'
        });
    }

    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
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

    res.clearCookie('accessToken');
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

    console.log(`[USER] Account deleted: ${user.email}`);

    return res.json({
        success: true,
        message: 'Account deleted successfully'
    });
});

const getAllUsers = catchAsync(async (req, res) => {
    console.log(`[USER] Fetching all users: ${req.user._id}`);

    const users = await User.find()
        .select('-password -twoFactorSecret -backupCodes -emailVerificationToken -passwordResetToken');

    console.log(`[USER] All users fetched: ${users.length}`);

    return res.json({
        success: true,
        data: { users, total: users.length }
    });
});

const getUserById = catchAsync(async (req, res) => {
    const { userId } = req.params;
    console.log(`[USER] Fetching user by ID: ${userId}`);

    const user = await User.findById(userId)
        .select('-password -twoFactorSecret -backupCodes -emailVerificationToken -passwordResetToken');

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            code: 'USER_NOT_FOUND'
        });
    }

    console.log(`[USER] User fetched: ${user.email}`);

    return res.json({
        success: true,
        data: { user }
    });
});

const updateUserRole = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    console.log(`[USER] Updating user role: ${userId} -> ${role}`);

    if (!role) {
        return res.status(400).json({
            success: false,
            message: 'Role is required',
            code: 'MISSING_FIELDS'
        });
    }

    const user = await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true, runValidators: true }
    ).select('-password -twoFactorSecret -backupCodes -emailVerificationToken -passwordResetToken');

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            code: 'USER_NOT_FOUND'
        });
    }

    await AuditLog.create({
        user: req.user._id,
        action: 'user_role_updated',
        actionCategory: 'user',
        entityType: 'user',
        entityId: user._id,
        status: 'success',
        severity: 'info',
        changes: { role },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[USER] User role updated: ${user.email} -> ${role}`);

    return res.json({
        success: true,
        message: 'User role updated successfully',
        data: { user }
    });
});

const updateUserStatus = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { status } = req.body;
    console.log(`[USER] Updating user status: ${userId} -> ${status}`);

    if (!status) {
        return res.status(400).json({
            success: false,
            message: 'Status is required',
            code: 'MISSING_FIELDS'
        });
    }

    const updateData = {};
    if (status === 'active') updateData.isActive = true;
    if (status === 'inactive') updateData.isActive = false;
    if (status === 'suspended') updateData.isSuspended = true;

    const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
    ).select('-password -twoFactorSecret -backupCodes -emailVerificationToken -passwordResetToken');

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            code: 'USER_NOT_FOUND'
        });
    }

    await AuditLog.create({
        user: req.user._id,
        action: 'user_status_updated',
        actionCategory: 'user',
        entityType: 'user',
        entityId: user._id,
        status: 'success',
        severity: 'info',
        changes: { status },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[USER] User status updated: ${user.email} -> ${status}`);

    return res.json({
        success: true,
        message: 'User status updated successfully',
        data: { user }
    });
});

const bulkUserOperation = catchAsync(async (req, res) => {
    const { operation, userIds } = req.body;
    console.log(`[USER] Bulk operation: ${operation} on ${userIds?.length} users`);

    if (!operation || !userIds || userIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Operation and userIds are required',
            code: 'MISSING_FIELDS'
        });
    }

    let updateData = {};
    if (operation === 'activate') updateData.isActive = true;
    if (operation === 'deactivate') updateData.isActive = false;
    if (operation === 'suspend') updateData.isSuspended = true;
    if (operation === 'unsuspend') updateData.isSuspended = false;

    const result = await User.updateMany(
        { _id: { $in: userIds } },
        updateData
    );

    await AuditLog.create({
        user: req.user._id,
        action: 'bulk_user_operation',
        actionCategory: 'user',
        entityType: 'user',
        status: 'success',
        severity: 'warning',
        details: { operation, count: userIds.length, modifiedCount: result.modifiedCount },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[USER] Bulk operation completed: ${operation} on ${result.modifiedCount} users`);

    return res.json({
        success: true,
        message: `Bulk operation completed: ${result.modifiedCount} users updated`,
        data: { modifiedCount: result.modifiedCount }
    });
});

module.exports = {
    sendEmailVerificationLink,
    verifyEmailToken,
    register,
    login,
    logout,
    googleAuthCallback,
    githubAuthCallback,
    refreshAccessToken,
    getCurrentUser,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    deleteAccount,
    getAllUsers,
    getUserById,
    updateUserRole,
    updateUserStatus,
    bulkUserOperation
};