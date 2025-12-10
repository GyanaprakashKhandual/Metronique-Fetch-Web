const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Find this section in your audit.model.js (or auditlog.model.js):

    action: {
        type: String,
        enum: [
            'user_created',
            'user_updated',
            'user_deleted',
            'user_login',
            'user_logout',
            'project_created',
            'project_updated',
            'project_deleted',
            'project_created_unified_structure',
            'project_created_with_structure',
            'analysis_started',
            'repository_connected',
            'database_connected',
            'test_execution_started',
            'test_execution_completed',
            'file_created',
            'file_updated',
            'file_deleted',
            'folder_created',
            'folder_updated',
            'folder_deleted',
            'test_folder_generated',
            'test_script_created',
            'test_script_updated',
            'test_script_deleted'
        ],
        required: true
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