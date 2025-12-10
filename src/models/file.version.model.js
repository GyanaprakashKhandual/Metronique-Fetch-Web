const mongoose = require('mongoose');

const codeChangeHistorySchema = new mongoose.Schema({
    file: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestFile',
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    version: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FileVersion'
    },
    changeType: {
        type: String,
        enum: ['created', 'modified', 'deleted', 'renamed', 'moved', 'restored', 'reverted', 'locked', 'unlocked'],
        required: true
    },
    action: {
        type: String,
        required: true
    },
    description: String,
    changes: {
        before: {
            content: String,
            fileName: String,
            path: String,
            size: Number
        },
        after: {
            content: String,
            fileName: String,
            path: String,
            size: Number
        },
        diff: String,
        linesAdded: {
            type: Number,
            default: 0
        },
        linesRemoved: {
            type: Number,
            default: 0
        },
        linesModified: {
            type: Number,
            default: 0
        }
    },
    affectedLines: [{
        lineNumber: Number,
        type: {
            type: String,
            enum: ['added', 'removed', 'modified']
        },
        oldContent: String,
        newContent: String
    }],
    relatedChanges: [{
        file: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TestFile'
        },
        changeType: String,
        description: String
    }],
    metadata: {
        editor: String,
        ipAddress: String,
        userAgent: String,
        location: String,
        sessionId: String
    },
    context: {
        branch: String,
        commit: String,
        pullRequest: String,
        issue: String
    },
    impact: {
        affectedFiles: {
            type: Number,
            default: 1
        },
        affectedTests: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TestScript'
        }],
        breakingChange: {
            type: Boolean,
            default: false
        },
        needsReview: {
            type: Boolean,
            default: false
        }
    },
    review: {
        reviewed: {
            type: Boolean,
            default: false
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reviewedAt: Date,
        approved: {
            type: Boolean,
            default: false
        },
        comments: String
    },
    isReverted: {
        type: Boolean,
        default: false
    },
    revertedAt: Date,
    revertedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    revertReason: String,
    tags: [String],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false
});

codeChangeHistorySchema.index({ file: 1, timestamp: -1 });
codeChangeHistorySchema.index({ project: 1, timestamp: -1 });
codeChangeHistorySchema.index({ createdBy: 1, timestamp: -1 });
codeChangeHistorySchema.index({ changeType: 1 });
codeChangeHistorySchema.index({ timestamp: -1 });
codeChangeHistorySchema.index({ isReverted: 1 });
codeChangeHistorySchema.index({ 'review.needsReview': 1 });
codeChangeHistorySchema.index({ 'impact.breakingChange': 1 });

codeChangeHistorySchema.methods.revert = async function (userId, reason) {
    this.isReverted = true;
    this.revertedAt = Date.now();
    this.revertedBy = userId;
    this.revertReason = reason;
    await this.save();
};

codeChangeHistorySchema.methods.approve = async function (userId, comments) {
    this.review.reviewed = true;
    this.review.reviewedBy = userId;
    this.review.reviewedAt = Date.now();
    this.review.approved = true;
    this.review.comments = comments;
    await this.save();
};

codeChangeHistorySchema.methods.reject = async function (userId, comments) {
    this.review.reviewed = true;
    this.review.reviewedBy = userId;
    this.review.reviewedAt = Date.now();
    this.review.approved = false;
    this.review.comments = comments;
    await this.save();
};

module.exports = mongoose.model('CodeChangeHistory', codeChangeHistorySchema);