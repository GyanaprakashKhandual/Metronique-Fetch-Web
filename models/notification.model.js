const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: [
            'test_completed',
            'test_failed',
            'test_started',
            'team_invitation',
            'team_member_added',
            'team_member_removed',
            'project_shared',
            'project_access_granted',
            'project_access_revoked',
            'repository_connected',
            'repository_sync_completed',
            'repository_sync_failed',
            'test_script_generated',
            'test_execution_scheduled',
            'load_test_completed',
            'report_generated',
            'comment_added',
            'mention',
            'system_alert',
            'account_update',
            'subscription_expiring',
            'subscription_expired',
            'payment_failed',
            'storage_limit_reached',
            'api_limit_reached'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    category: {
        type: String,
        enum: ['test', 'team', 'project', 'system', 'billing', 'security'],
        default: 'system'
    },
    status: {
        type: String,
        enum: ['unread', 'read', 'archived', 'deleted'],
        default: 'unread'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: Date,
    relatedEntity: {
        entityType: {
            type: String,
            enum: ['project', 'test', 'team', 'repository', 'report', 'invitation', 'user']
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId
        }
    },
    actionUrl: String,
    actionText: String,
    metadata: {
        projectName: String,
        teamName: String,
        testName: String,
        executionId: String,
        errorDetails: String,
        additionalInfo: mongoose.Schema.Types.Mixed
    },
    channels: {
        inApp: {
            type: Boolean,
            default: true
        },
        email: {
            sent: {
                type: Boolean,
                default: false
            },
            sentAt: Date,
            failed: {
                type: Boolean,
                default: false
            },
            failureReason: String
        },
        slack: {
            sent: {
                type: Boolean,
                default: false
            },
            sentAt: Date,
            failed: {
                type: Boolean,
                default: false
            },
            failureReason: String,
            messageId: String
        },
        webhook: {
            sent: {
                type: Boolean,
                default: false
            },
            sentAt: Date,
            failed: {
                type: Boolean,
                default: false
            },
            failureReason: String,
            responseCode: Number
        }
    },
    expiresAt: Date,
    scheduledFor: Date,
    batchId: String,
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

notificationSchema.index({ recipient: 1, status: 1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ batchId: 1 });
notificationSchema.index({ 'relatedEntity.entityType': 1, 'relatedEntity.entityId': 1 });

notificationSchema.methods.markAsRead = async function() {
    this.isRead = true;
    this.readAt = Date.now();
    this.status = 'read';
    await this.save();
};

notificationSchema.methods.archive = async function() {
    this.status = 'archived';
    await this.save();
};

notificationSchema.methods.markAsDeleted = async function() {
    this.status = 'deleted';
    await this.save();
};

notificationSchema.methods.isExpired = function() {
    return this.expiresAt && this.expiresAt < Date.now();
};

module.exports = mongoose.model('Notification', notificationSchema);