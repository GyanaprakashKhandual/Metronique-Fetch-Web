const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../../models/user.model');
const AuditLog = require('../../models/audit.model');

class PasswordService {
    constructor() {
        this.saltRounds = 12;
        this.minPasswordLength = 8;
        this.maxPasswordLength = 128;
        this.passwordExpiryDays = 90;
        this.passwordResetTokenExpiry = 3600;
        this.maxLoginAttempts = 5;
        this.lockoutDurationMinutes = 15;
        this.passwordHistoryCount = 5;
    }

    async hashPassword(plainPassword) {
        console.log(`[PasswordService] Hashing password with bcrypt (rounds: ${this.saltRounds})`);

        try {
            if (!plainPassword) {
                throw new Error('Password cannot be empty');
            }

            const hash = await bcrypt.hash(plainPassword, this.saltRounds);
            console.log(`[PasswordService] Password hashed successfully`);

            return hash;
        } catch (error) {
            console.error(`[PasswordService] Error hashing password:`, error.message);
            throw error;
        }
    }

    async comparePasswords(plainPassword, hashedPassword) {
        console.log(`[PasswordService] Comparing passwords securely`);

        try {
            const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
            console.log(`[PasswordService] Password comparison completed: ${isMatch ? 'match' : 'no match'}`);

            return isMatch;
        } catch (error) {
            console.error(`[PasswordService] Error comparing passwords:`, error.message);
            throw error;
        }
    }

    validatePasswordStrength(password) {
        console.log(`[PasswordService] Validating password strength`);

        const issues = [];
        const warnings = [];

        if (password.length < this.minPasswordLength) {
            issues.push(`Password must be at least ${this.minPasswordLength} characters long`);
        }

        if (password.length > this.maxPasswordLength) {
            issues.push(`Password must not exceed ${this.maxPasswordLength} characters`);
        }

        if (!/[a-z]/.test(password)) {
            issues.push('Password must contain at least one lowercase letter');
        }

        if (!/[A-Z]/.test(password)) {
            issues.push('Password must contain at least one uppercase letter');
        }

        if (!/[0-9]/.test(password)) {
            issues.push('Password must contain at least one number');
        }

        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            issues.push('Password must contain at least one special character');
        }

        if (/(.)\1{2,}/.test(password)) {
            warnings.push('Password contains repeated characters');
        }

        if (/^(012|123|234|345|456|567|678|789|abc|bcd|cde|def)/.test(password.toLowerCase())) {
            warnings.push('Password contains sequential characters');
        }

        const strength = issues.length === 0 ? 'strong' : issues.length <= 2 ? 'moderate' : 'weak';

        console.log(`[PasswordService] Password strength: ${strength}`);

        return {
            isValid: issues.length === 0,
            strength: strength,
            issues: issues,
            warnings: warnings,
            score: Math.max(0, 100 - (issues.length * 20 + warnings.length * 10))
        };
    }

    generatePasswordResetToken() {
        console.log(`[PasswordService] Generating password reset token`);

        try {
            const token = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

            console.log(`[PasswordService] Password reset token generated`);

            return {
                token: token,
                hashedToken: hashedToken,
                expiresAt: new Date(Date.now() + this.passwordResetTokenExpiry * 1000)
            };
        } catch (error) {
            console.error(`[PasswordService] Error generating reset token:`, error.message);
            throw error;
        }
    }

    async changePassword(userId, oldPassword, newPassword) {
        console.log(`[PasswordService] Changing password for user: ${userId}`);

        try {
            const user = await User.findById(userId).select('+password');

            if (!user) {
                throw new Error('User not found');
            }

            const isOldPasswordValid = await this.comparePasswords(oldPassword, user.password);

            if (!isOldPasswordValid) {
                throw new Error('Current password is incorrect');
            }

            const strength = this.validatePasswordStrength(newPassword);
            if (!strength.isValid) {
                throw new Error(`Password does not meet strength requirements: ${strength.issues.join(', ')}`);
            }

            const isReused = await this.checkPasswordHistory(userId, newPassword);
            if (isReused) {
                throw new Error(`You cannot reuse one of your last ${this.passwordHistoryCount} passwords`);
            }

            const hashedPassword = await this.hashPassword(newPassword);

            user.password = hashedPassword;
            user.passwordChangedAt = new Date();
            user.loginAttempts = 0;
            user.lockUntil = undefined;

            await user.save();

            await this.addPasswordHistory(userId, hashedPassword);

            await AuditLog.create({
                user: userId,
                action: 'password_changed',
                actionCategory: 'security',
                entityType: 'user',
                entityId: userId,
                status: 'success',
                severity: 'info',
                details: { description: 'User password changed successfully' }
            });

            console.log(`[PasswordService] Password changed successfully for user: ${userId}`);
            return { success: true, message: 'Password changed successfully' };
        } catch (error) {
            console.error(`[PasswordService] Error changing password:`, error.message);
            throw error;
        }
    }

    async resetPassword(resetToken, newPassword) {
        console.log(`[PasswordService] Resetting password with token`);

        try {
            const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

            const user = await User.findOne({
                passwordResetToken: hashedToken,
                passwordResetExpires: { $gt: Date.now() }
            });

            if (!user) {
                throw new Error('Password reset token is invalid or has expired');
            }

            const strength = this.validatePasswordStrength(newPassword);
            if (!strength.isValid) {
                throw new Error(`Password does not meet strength requirements: ${strength.issues.join(', ')}`);
            }

            const hashedPassword = await this.hashPassword(newPassword);

            user.password = hashedPassword;
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            user.passwordChangedAt = new Date();
            user.loginAttempts = 0;
            user.lockUntil = undefined;

            await user.save();

            await this.addPasswordHistory(user._id, hashedPassword);

            await AuditLog.create({
                user: user._id,
                action: 'password_reset',
                actionCategory: 'security',
                entityType: 'user',
                entityId: user._id,
                status: 'success',
                severity: 'info',
                details: { description: 'User password reset successfully' }
            });

            console.log(`[PasswordService] Password reset successfully for user: ${user._id}`);
            return { success: true, message: 'Password reset successfully' };
        } catch (error) {
            console.error(`[PasswordService] Error resetting password:`, error.message);
            throw error;
        }
    }

    async addPasswordHistory(userId, hashedPassword) {
        console.log(`[PasswordService] Adding password to history for user: ${userId}`);

        try {
            const user = await User.findById(userId);

            if (!user.passwordHistory) {
                user.passwordHistory = [];
            }

            user.passwordHistory.push({
                hash: hashedPassword,
                changedAt: new Date()
            });

            if (user.passwordHistory.length > this.passwordHistoryCount) {
                user.passwordHistory = user.passwordHistory.slice(-this.passwordHistoryCount);
            }

            await user.save();

            console.log(`[PasswordService] Password added to history`);
        } catch (error) {
            console.error(`[PasswordService] Error adding to password history:`, error.message);
        }
    }

    async checkPasswordHistory(userId, newPassword) {
        console.log(`[PasswordService] Checking password history for reuse`);

        try {
            const user = await User.findById(userId);

            if (!user.passwordHistory || user.passwordHistory.length === 0) {
                return false;
            }

            for (const historyEntry of user.passwordHistory) {
                const isReused = await bcrypt.compare(newPassword, historyEntry.hash);
                if (isReused) {
                    console.warn(`[PasswordService] Password reuse detected`);
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error(`[PasswordService] Error checking password history:`, error.message);
            throw error;
        }
    }

    async recordFailedLoginAttempt(userId) {
        console.log(`[PasswordService] Recording failed login attempt for user: ${userId}`);

        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new Error('User not found');
            }

            user.loginAttempts = (user.loginAttempts || 0) + 1;

            if (user.loginAttempts >= this.maxLoginAttempts) {
                user.lockUntil = new Date(Date.now() + this.lockoutDurationMinutes * 60 * 1000);

                await AuditLog.create({
                    user: userId,
                    action: 'account_locked',
                    actionCategory: 'security',
                    entityType: 'user',
                    entityId: userId,
                    status: 'warning',
                    severity: 'warning',
                    details: {
                        description: `Account locked after ${this.maxLoginAttempts} failed login attempts`
                    }
                });

                console.warn(`[PasswordService] Account locked for user: ${userId}`);
            }

            await user.save();

            console.log(`[PasswordService] Failed login attempt recorded: ${user.loginAttempts}/${this.maxLoginAttempts}`);
            return user.loginAttempts;
        } catch (error) {
            console.error(`[PasswordService] Error recording failed attempt:`, error.message);
            throw error;
        }
    }

    async recordSuccessfulLogin(userId) {
        console.log(`[PasswordService] Recording successful login for user: ${userId}`);

        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new Error('User not found');
            }

            user.loginAttempts = 0;
            user.lockUntil = undefined;
            user.lastLogin = new Date();

            await user.save();

            console.log(`[PasswordService] Successful login recorded for user: ${userId}`);
            return { success: true };
        } catch (error) {
            console.error(`[PasswordService] Error recording successful login:`, error.message);
            throw error;
        }
    }

    isAccountLocked(user) {
        console.log(`[PasswordService] Checking if account is locked`);

        if (!user.lockUntil) {
            return false;
        }

        if (user.lockUntil < new Date()) {
            console.log(`[PasswordService] Account lock expired`);
            return false;
        }

        console.log(`[PasswordService] Account is locked`);
        return true;
    }

    async unlockAccount(userId) {
        console.log(`[PasswordService] Unlocking account for user: ${userId}`);

        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new Error('User not found');
            }

            user.loginAttempts = 0;
            user.lockUntil = undefined;

            await user.save();

            await AuditLog.create({
                user: userId,
                action: 'account_unlocked',
                actionCategory: 'security',
                entityType: 'user',
                entityId: userId,
                status: 'success',
                severity: 'info',
                details: { description: 'Account unlocked' }
            });

            console.log(`[PasswordService] Account unlocked successfully for user: ${userId}`);
            return { success: true, message: 'Account unlocked' };
        } catch (error) {
            console.error(`[PasswordService] Error unlocking account:`, error.message);
            throw error;
        }
    }

    getPasswordPolicy() {
        console.log(`[PasswordService] Retrieving password policy`);

        return {
            minLength: this.minPasswordLength,
            maxLength: this.maxPasswordLength,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialCharacters: true,
            expiryDays: this.passwordExpiryDays,
            historyCount: this.passwordHistoryCount,
            maxLoginAttempts: this.maxLoginAttempts,
            lockoutDurationMinutes: this.lockoutDurationMinutes
        };
    }
}

module.exports = new PasswordService();