const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String
    },
    lastName: {
        type: String
    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    username: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        select: false
    },
    avatar: {
        url: String,
        publicId: String
    },
    bio: {
        type: String
    },
    phone: {
        countryCode: String,
        number: String
    },
    timezone: {
        type: String,
        default: 'UTC'
    },
    language: {
        type: String,
        default: 'en',
        enum: ['en', 'es', 'fr', 'de', 'pt', 'hi', 'ja', 'zh']
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isSuspended: {
        type: Boolean,
        default: false
    },
    suspensionReason: String,
    suspendedAt: Date,
    suspendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordChangedAt: Date,
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: String,
    backupCodes: [String],
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    lastLogin: Date,
    lastLoginIP: String,
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'starter', 'professional', 'enterprise', 'custom'],
            default: 'free'
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'trial', 'cancelled', 'expired', 'past_due'],
            default: 'trial'
        },
        startDate: Date,
        endDate: Date,
        trialEndDate: Date,
        cancelledAt: Date,
        cancelReason: String,
        stripeCustomerId: String,
        stripeSubscriptionId: String,
        currentPeriodStart: Date,
        currentPeriodEnd: Date,
        autoRenew: {
            type: Boolean,
            default: true
        }
    },
    usage: {
        apiTestsRun: {
            type: Number,
            default: 0
        },
        testScriptsGenerated: {
            type: Number,
            default: 0
        },
        repositoriesConnected: {
            type: Number,
            default: 0
        },
        storageUsed: {
            type: Number,
            default: 0
        },
        teamMembersAdded: {
            type: Number,
            default: 0
        },
        projectsCreated: {
            type: Number,
            default: 0
        },
        lastResetDate: Date
    },
    limits: {
        maxApiTests: {
            type: Number,
            default: 100
        },
        maxTestScripts: {
            type: Number,
            default: 10
        },
        maxRepositories: {
            type: Number,
            default: 3
        },
        maxStorage: {
            type: Number,
            default: 500
        },
        maxTeamMembers: {
            type: Number,
            default: 5
        },
        maxProjects: {
            type: Number,
            default: 3
        }
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'super_admin'],
        default: 'user'
    },
    permissions: [{
        type: String,
        enum: [
            'view_dashboard',
            'manage_projects',
            'run_tests',
            'view_reports',
            'manage_team',
            'manage_billing',
            'manage_integrations',
            'access_api',
            'delete_data',
            'export_data'
        ]
    }],
    ownedTeams: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    }],
    teamMemberships: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TeamMember'
    }],
    ownedProjects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
    projectAccess: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectAccess'
    }],
    invitations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invitation'
    }],
    preferences: {
        emailNotifications: {
            testCompleted: { type: Boolean, default: true },
            testFailed: { type: Boolean, default: true },
            weeklyReport: { type: Boolean, default: true },
            teamInvites: { type: Boolean, default: true },
            productUpdates: { type: Boolean, default: false }
        },
        slackNotifications: {
            enabled: { type: Boolean, default: false },
            webhookUrl: String,
            testCompleted: { type: Boolean, default: true },
            testFailed: { type: Boolean, default: true }
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'light'
        },
        defaultDashboard: {
            type: String,
            enum: ['overview', 'projects', 'tests', 'reports'],
            default: 'overview'
        }
    },
    integrations: {
        github: {
            connected: { type: Boolean, default: false },
            accessToken: String,
            refreshToken: String,
            username: String,
            expiresAt: Date
        },
        slack: {
            connected: { type: Boolean, default: false },
            accessToken: String,
            teamId: String,
            teamName: String,
            channelId: String
        },
        jira: {
            connected: { type: Boolean, default: false },
            apiToken: String,
            domain: String,
            email: String
        }
    },
    analytics: {
        totalTestsRun: { type: Number, default: 0 },
        totalTestsPassed: { type: Number, default: 0 },
        totalTestsFailed: { type: Number, default: 0 },
        averageTestDuration: { type: Number, default: 0 },
        lastTestRun: Date,
        totalLoginCount: { type: Number, default: 0 },
        totalProjectsCreated: { type: Number, default: 0 }
    },
    referral: {
        code: {
            type: String,
            unique: true,
            sparse: true
        },
        referredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        referredUsers: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            status: {
                type: String,
                enum: ['pending', 'completed', 'expired'],
                default: 'pending'
            },
            rewardEarned: Number,
            date: Date
        }],
        totalRewards: {
            type: Number,
            default: 0
        }
    },
    metadata: {
        signupSource: {
            type: String,
            enum: ['web', 'mobile', 'api', 'referral', 'admin'],
            default: 'web'
        },
        signupIP: String,
        userAgent: String,
        utmSource: String,
        utmMedium: String,
        utmCampaign: String
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date,
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1, isDeleted: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'referral.code': 1 });

userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 12);
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

userSchema.pre('save', function (next) {
    if (this.isNew && !this.referral.code) {
        this.referral.code = generateReferralCode();
    }
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function () {
    return jwt.sign(
        {
            id: this._id,
            email: this.email,
            role: this.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { id: this._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '30d' }
    );
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

userSchema.methods.incLoginAttempts = function () {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };
    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000;

    if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + lockTime };
    }

    return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
    return this.updateOne({
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 }
    });
};

userSchema.methods.canPerformAction = function (action) {
    const usageMap = {
        'run_test': { usage: 'apiTestsRun', limit: 'maxApiTests' },
        'generate_script': { usage: 'testScriptsGenerated', limit: 'maxTestScripts' },
        'connect_repo': { usage: 'repositoriesConnected', limit: 'maxRepositories' },
        'create_project': { usage: 'projectsCreated', limit: 'maxProjects' },
        'add_member': { usage: 'teamMembersAdded', limit: 'maxTeamMembers' }
    };

    const mapping = usageMap[action];
    if (!mapping) return true;

    return this.usage[mapping.usage] < this.limits[mapping.limit];
};

userSchema.methods.incrementUsage = function (action) {
    const usageMap = {
        'run_test': 'apiTestsRun',
        'generate_script': 'testScriptsGenerated',
        'connect_repo': 'repositoriesConnected',
        'create_project': 'projectsCreated',
        'add_member': 'teamMembersAdded'
    };

    const field = usageMap[action];
    if (field) {
        this.usage[field]++;
        return this.save();
    }
};

function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

module.exports = mongoose.model('User', userSchema);