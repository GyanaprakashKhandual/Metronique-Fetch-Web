const mongoose = require('mongoose');

const projectAccessSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    accessLevel: {
        type: String,
        enum: ['view', 'edit', 'admin'],
        default: 'view'
    },
    permissions: {
        canViewProject: { type: Boolean, default: true },
        canEditProject: { type: Boolean, default: false },
        canDeleteProject: { type: Boolean, default: false },
        canArchiveProject: { type: Boolean, default: false },
        canConnectRepository: { type: Boolean, default: false },
        canDisconnectRepository: { type: Boolean, default: false },
        canSyncRepository: { type: Boolean, default: false },
        canManageDatabases: { type: Boolean, default: false },
        canTestDatabases: { type: Boolean, default: false },
        canViewTestScripts: { type: Boolean, default: true },
        canCreateTestScripts: { type: Boolean, default: false },
        canEditTestScripts: { type: Boolean, default: false },
        canDeleteTestScripts: { type: Boolean, default: false },
        canRunTests: { type: Boolean, default: false },
        canStopTests: { type: Boolean, default: false },
        canScheduleTests: { type: Boolean, default: false },
        canEditTestConfig: { type: Boolean, default: false },
        canManageEnvironmentVars: { type: Boolean, default: false },
        canRunLoadTests: { type: Boolean, default: false },
        canConfigureLoadTests: { type: Boolean, default: false },
        canViewReports: { type: Boolean, default: true },
        canExportReports: { type: Boolean, default: false },
        canDeleteReports: { type: Boolean, default: false },
        canManageIntegrations: { type: Boolean, default: false },
        canManageNotifications: { type: Boolean, default: false },
        canManageCICD: { type: Boolean, default: false },
        canManageAccess: { type: Boolean, default: false },
        canInviteUsers: { type: Boolean, default: false },
        canRemoveUsers: { type: Boolean, default: false },
        canUploadFiles: { type: Boolean, default: false },
        canDownloadFiles: { type: Boolean, default: true },
        canDeleteFiles: { type: Boolean, default: false }
    },
    grantedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    grantedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'expired', 'revoked'],
        default: 'active'
    },
    expiresAt: Date,
    revokedAt: Date,
    revokedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    revokeReason: String,
    lastAccessedAt: Date,
    accessCount: {
        type: Number,
        default: 0
    },
    notifyOnAccess: {
        type: Boolean,
        default: false
    },
    metadata: {
        ipAddress: String,
        userAgent: String,
        source: {
            type: String,
            enum: ['direct', 'invitation', 'team', 'admin'],
            default: 'direct'
        }
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
    timestamps: true
});

projectAccessSchema.index({ project: 1, user: 1 }, { unique: true });
projectAccessSchema.index({ user: 1 });
projectAccessSchema.index({ project: 1, accessLevel: 1 });
projectAccessSchema.index({ status: 1 });
projectAccessSchema.index({ expiresAt: 1 });
projectAccessSchema.index({ project: 1, status: 1 });
projectAccessSchema.index({ user: 1, status: 1 });

projectAccessSchema.pre('save', function (next) {
    if (this.isModified('accessLevel')) {
        switch (this.accessLevel) {
            case 'admin':
                Object.keys(this.permissions).forEach(key => {
                    this.permissions[key] = true;
                });
                break;

            case 'edit':
                this.permissions.canViewProject = true;
                this.permissions.canEditProject = true;
                this.permissions.canViewTestScripts = true;
                this.permissions.canCreateTestScripts = true;
                this.permissions.canEditTestScripts = true;
                this.permissions.canRunTests = true;
                this.permissions.canStopTests = true;
                this.permissions.canViewReports = true;
                this.permissions.canExportReports = true;
                this.permissions.canUploadFiles = true;
                this.permissions.canDownloadFiles = true;
                this.permissions.canEditTestConfig = true;
                break;

            case 'view':
                Object.keys(this.permissions).forEach(key => {
                    this.permissions[key] = false;
                });
                this.permissions.canViewProject = true;
                this.permissions.canViewTestScripts = true;
                this.permissions.canViewReports = true;
                this.permissions.canDownloadFiles = true;
                break;
        }
    }
    next();
});

projectAccessSchema.methods.isValid = function () {
    if (this.status !== 'active') {
        return false;
    }

    if (this.expiresAt && this.expiresAt < Date.now()) {
        this.status = 'expired';
        this.save();
        return false;
    }

    return true;
};

projectAccessSchema.methods.hasPermission = function (permission) {
    if (!this.isValid()) {
        return false;
    }

    return this.permissions[permission] || false;
};

projectAccessSchema.methods.revoke = async function (revokedBy, reason) {
    this.status = 'revoked';
    this.revokedAt = Date.now();
    this.revokedBy = revokedBy;
    this.revokeReason = reason;
    await this.save();
};

projectAccessSchema.methods.updateLastAccessed = function () {
    this.lastAccessedAt = Date.now();
    this.accessCount++;
    return this.save();
};

projectAccessSchema.methods.extendExpiry = function (days) {
    if (this.expiresAt) {
        this.expiresAt = new Date(this.expiresAt.getTime() + (days * 24 * 60 * 60 * 1000));
    } else {
        this.expiresAt = new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
    }
    return this.save();
};

module.exports = mongoose.model('ProjectAccess', projectAccessSchema);