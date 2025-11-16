const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'user_login',
            'user_logout',
            'user_created',
            'user_updated',
            'user_deleted',
            'password_changed',
            'password_reset',
            'email_verified',
            'team_created',
            'team_updated',
            'team_deleted',
            'team_member_added',
            'team_member_removed',
            'team_member_role_changed',
            'project_created',
            'project_updated',
            'project_deleted',
            'project_archived',
            'repository_connected',
            'repository_disconnected',
            'repository_synced',
            'database_connected',
            'database_disconnected',
            'database_tested',
            'test_script_generated',
            'test_script_updated',
            'test_script_deleted',
            'test_executed',
            'test_stopped',
            'test_scheduled',
            'load_test_executed',
            'report_generated',
            'report_exported',
            'report_deleted',
            'file_uploaded',
            'file_created',
            'file_updated',
            'file_deleted',
            'file_renamed',
            'folder_created',
            'folder_deleted',
            'folder_renamed',
            'invitation_sent',
            'invitation_accepted',
            'invitation_declined',
            'invitation_cancelled',
            'access_granted',
            'access_revoked',
            'permission_changed',
            'integration_connected',
            'integration_disconnected',
            'notification_sent',
            'webhook_triggered',
            'api_key_created',
            'api_key_deleted',
            'settings_updated',
            'subscription_created',
            'subscription_updated',
            'subscription_cancelled',
            'payment_successful',
            'payment_failed'
        ]
    },
    actionCategory: {
        type: String,
        enum: ['authentication', 'authorization', 'user', 'team', 'project', 'repository', 'database', 'test', 'file', 'integration', 'billing', 'system'],
        required: true
    },
    entityType: {
        type: String,
        enum: ['user', 'team', 'project', 'repository', 'database', 'test', 'file', 'folder', 'invitation', 'report', 'integration', 'subscription']
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId
    },
    entityName: String,
    changes: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed
    },
    details: {
        description: String,
        reason: String,
        additionalInfo: mongoose.Schema.Types.Mixed
    },
    status: {
        type: String,
        enum: ['success', 'failure', 'pending', 'partial'],
        default: 'success'
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'error', 'critical'],
        default: 'info'
    },
    ipAddress: String,
    userAgent: String,
    location: {
        country: String,
        region: String,
        city: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    device: {
        type: String,
        browser: String,
        os: String,
        platform: String
    },
    requestId: String,
    sessionId: String,
    duration: Number,
    errorMessage: String,
    stackTrace: String,
    affectedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    relatedEntities: [{
        entityType: String,
        entityId: mongoose.Schema.Types.ObjectId,
        entityName: String
    }],
    metadata: mongoose.Schema.Types.Mixed,
    timestamp: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ actionCategory: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ status: 1 });
auditLogSchema.index({ severity: 1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ requestId: 1 });
auditLogSchema.index({ sessionId: 1 });
auditLogSchema.index({ ipAddress: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);