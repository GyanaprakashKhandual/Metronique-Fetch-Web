const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        enum: ['owner', 'admin', 'member', 'viewer'],
        default: 'member'
    },
    customPermissions: {
        canManageTeam: { type: Boolean, default: false },
        canManageProjects: { type: Boolean, default: false },
        canCreateProjects: { type: Boolean, default: true },
        canDeleteProjects: { type: Boolean, default: false },
        canManageMembers: { type: Boolean, default: false },
        canInviteMembers: { type: Boolean, default: false },
        canRemoveMembers: { type: Boolean, default: false },
        canRunTests: { type: Boolean, default: true },
        canViewTests: { type: Boolean, default: true },
        canEditTests: { type: Boolean, default: true },
        canDeleteTests: { type: Boolean, default: false },
        canViewReports: { type: Boolean, default: true },
        canExportReports: { type: Boolean, default: false },
        canManageBilling: { type: Boolean, default: false },
        canManageIntegrations: { type: Boolean, default: false }
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    invitedAt: Date,
    joinedAt: {
        type: Date,
        default: Date.now
    },
    lastActiveAt: Date,
    lastAccessedProjectAt: Date,
    notifications: {
        email: { type: Boolean, default: true },
        slack: { type: Boolean, default: false },
        inApp: { type: Boolean, default: true }
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

teamMemberSchema.index({ team: 1, user: 1 }, { unique: true });
teamMemberSchema.index({ user: 1 });
teamMemberSchema.index({ team: 1, role: 1 });
teamMemberSchema.index({ status: 1 });

teamMemberSchema.methods.hasPermission = function (permission) {
    if (this.role === 'owner' || this.role === 'admin') {
        return true;
    }

    if (this.role === 'viewer') {
        const viewerPermissions = ['canViewTests', 'canViewReports'];
        return viewerPermissions.includes(permission);
    }

    return this.customPermissions[permission] || false;
};

teamMemberSchema.methods.updateLastActive = function () {
    this.lastActiveAt = Date.now();
    return this.save();
};

teamMemberSchema.pre('save', function (next) {
    if (this.isModified('role')) {
        switch (this.role) {
            case 'owner':
                Object.keys(this.customPermissions).forEach(key => {
                    this.customPermissions[key] = true;
                });
                break;
            case 'admin':
                Object.keys(this.customPermissions).forEach(key => {
                    this.customPermissions[key] = true;
                });
                this.customPermissions.canManageBilling = false;
                break;
            case 'viewer':
                Object.keys(this.customPermissions).forEach(key => {
                    this.customPermissions[key] = false;
                });
                this.customPermissions.canViewTests = true;
                this.customPermissions.canViewReports = true;
                break;
            case 'member':
                this.customPermissions.canCreateProjects = true;
                this.customPermissions.canRunTests = true;
                this.customPermissions.canViewTests = true;
                this.customPermissions.canEditTests = true;
                this.customPermissions.canViewReports = true;
                break;
        }
    }
    next();
});

module.exports = mongoose.model('TeamMember', teamMemberSchema);