const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    entityType: {
        type: String,
        enum: [
            'project',
            'repository',
            'endpoint',
            'test-script',
            'test-suite',
            'test-case',
            'test-execution',
            'test-result',
            'test-report',
            'test-config',
            'load-test',
            'database-connection',
            'test-folder',
            'test-file',
            'file-version',
            'team',
            'invitation',
            'notification',
            'user'
        ],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    entityName: String,
    content: {
        type: String,
        required: true,
        maxlength: 5000
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    },
    replies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }],
    thread: {
        isThread: {
            type: Boolean,
            default: false
        },
        level: {
            type: Number,
            default: 0
        },
        rootComment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Comment'
        }
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    mentions: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        notified: {
            type: Boolean,
            default: false
        }
    }],
    attachments: [{
        name: String,
        url: String,
        type: {
            type: String,
            enum: ['image', 'video', 'document', 'file']
        },
        size: Number,
        mimeType: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    formatting: {
        isMarkdown: {
            type: Boolean,
            default: true
        },
        isCode: {
            type: Boolean,
            default: false
        },
        codeLanguage: String
    },
    status: {
        type: String,
        enum: ['active', 'edited', 'deleted', 'flagged', 'resolved'],
        default: 'active'
    },
    visibility: {
        type: String,
        enum: ['public', 'team', 'private'],
        default: 'team'
    },
    reactions: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        type: {
            type: String,
            enum: ['like', 'love', 'helpful', 'celebrate', 'insightful', 'thumbs-up', 'thumbs-down']
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    reactionCounts: {
        like: {
            type: Number,
            default: 0
        },
        love: {
            type: Number,
            default: 0
        },
        helpful: {
            type: Number,
            default: 0
        },
        celebrate: {
            type: Number,
            default: 0
        },
        insightful: {
            type: Number,
            default: 0
        },
        thumbsUp: {
            type: Number,
            default: 0
        },
        thumbsDown: {
            type: Number,
            default: 0
        }
    },
    metadata: {
        isResolved: {
            type: Boolean,
            default: false
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        resolvedAt: Date,
        isPinned: {
            type: Boolean,
            default: false
        },
        pinnedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        pinnedAt: Date,
        isHighlighted: {
            type: Boolean,
            default: false
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent']
        }
    },
    editHistory: [{
        content: String,
        editedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        editedAt: {
            type: Date,
            default: Date.now
        },
        reason: String
    }],
    flags: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: {
            type: String,
            enum: ['spam', 'inappropriate', 'harassment', 'misinformation', 'other']
        },
        description: String,
        flaggedAt: {
            type: Date,
            default: Date.now
        },
        reviewed: {
            type: Boolean,
            default: false
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reviewedAt: Date,
        action: String
    }],
    analytics: {
        viewCount: {
            type: Number,
            default: 0
        },
        replyCount: {
            type: Number,
            default: 0
        },
        reactionCount: {
            type: Number,
            default: 0
        },
        lastViewedAt: Date
    },
    notifications: {
        notifyOnReply: {
            type: Boolean,
            default: true
        },
        notifyOnMention: {
            type: Boolean,
            default: true
        },
        notifyOnReaction: {
            type: Boolean,
            default: false
        }
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    lastEditedAt: Date,
    lastEditedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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
    deleteReason: String,
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

commentSchema.index({ project: 1, entityType: 1, entityId: 1 });
commentSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ 'thread.rootComment': 1 });
commentSchema.index({ status: 1 });
commentSchema.index({ isDeleted: 1 });
commentSchema.index({ 'metadata.isPinned': 1, createdAt: -1 });
commentSchema.index({ 'mentions.user': 1 });
commentSchema.index({ createdAt: -1 });

commentSchema.methods.addReply = async function (replyId) {
    if (!this.replies.includes(replyId)) {
        this.replies.push(replyId);
        this.analytics.replyCount++;
        await this.save();
    }
};

commentSchema.methods.removeReply = async function (replyId) {
    this.replies = this.replies.filter(id => id.toString() !== replyId.toString());
    this.analytics.replyCount = Math.max(0, this.analytics.replyCount - 1);
    await this.save();
};

commentSchema.methods.addReaction = async function (userId, reactionType) {
    const existingReaction = this.reactions.find(
        r => r.user.toString() === userId.toString()
    );

    if (existingReaction) {
        if (this.reactionCounts[existingReaction.type] > 0) {
            this.reactionCounts[existingReaction.type]--;
        }
        existingReaction.type = reactionType;
        existingReaction.createdAt = Date.now();
    } else {
        this.reactions.push({
            user: userId,
            type: reactionType,
            createdAt: Date.now()
        });
    }

    this.reactionCounts[reactionType] = (this.reactionCounts[reactionType] || 0) + 1;
    this.analytics.reactionCount = this.reactions.length;

    await this.save();
};

commentSchema.methods.removeReaction = async function (userId) {
    const reaction = this.reactions.find(
        r => r.user.toString() === userId.toString()
    );

    if (reaction) {
        if (this.reactionCounts[reaction.type] > 0) {
            this.reactionCounts[reaction.type]--;
        }

        this.reactions = this.reactions.filter(
            r => r.user.toString() !== userId.toString()
        );

        this.analytics.reactionCount = this.reactions.length;
        await this.save();
    }
};

commentSchema.methods.edit = async function (newContent, userId, reason) {
    this.editHistory.push({
        content: this.content,
        editedBy: userId,
        editedAt: Date.now(),
        reason
    });

    this.content = newContent;
    this.isEdited = true;
    this.lastEditedAt = Date.now();
    this.lastEditedBy = userId;
    this.status = 'edited';

    if (this.editHistory.length > 50) {
        this.editHistory = this.editHistory.slice(-50);
    }

    await this.save();
};

commentSchema.methods.softDelete = async function (userId, reason) {
    this.isDeleted = true;
    this.deletedAt = Date.now();
    this.deletedBy = userId;
    this.deleteReason = reason;
    this.status = 'deleted';
    await this.save();
};

commentSchema.methods.restore = async function () {
    this.isDeleted = false;
    this.deletedAt = undefined;
    this.deletedBy = undefined;
    this.deleteReason = undefined;
    this.status = 'active';
    await this.save();
};

commentSchema.methods.pin = async function (userId) {
    this.metadata.isPinned = true;
    this.metadata.pinnedBy = userId;
    this.metadata.pinnedAt = Date.now();
    await this.save();
};

commentSchema.methods.unpin = async function () {
    this.metadata.isPinned = false;
    this.metadata.pinnedBy = undefined;
    this.metadata.pinnedAt = undefined;
    await this.save();
};

commentSchema.methods.resolve = async function (userId) {
    this.metadata.isResolved = true;
    this.metadata.resolvedBy = userId;
    this.metadata.resolvedAt = Date.now();
    this.status = 'resolved';
    await this.save();
};

commentSchema.methods.unresolve = async function () {
    this.metadata.isResolved = false;
    this.metadata.resolvedBy = undefined;
    this.metadata.resolvedAt = undefined;
    this.status = 'active';
    await this.save();
};

commentSchema.methods.flag = async function (userId, reason, description) {
    this.flags.push({
        user: userId,
        reason,
        description,
        flaggedAt: Date.now(),
        reviewed: false
    });

    this.status = 'flagged';
    await this.save();
};

commentSchema.methods.reviewFlag = async function (flagId, userId, action) {
    const flag = this.flags.id(flagId);
    if (flag) {
        flag.reviewed = true;
        flag.reviewedBy = userId;
        flag.reviewedAt = Date.now();
        flag.action = action;

        const unreviewedFlags = this.flags.filter(f => !f.reviewed);
        if (unreviewedFlags.length === 0) {
            this.status = 'active';
        }

        await this.save();
    }
};

commentSchema.methods.incrementViewCount = async function () {
    this.analytics.viewCount++;
    this.analytics.lastViewedAt = Date.now();
    await this.save();
};

commentSchema.methods.extractMentions = function () {
    const mentionRegex = /@(\w+)/g;
    const matches = this.content.match(mentionRegex);

    if (matches) {
        return matches.map(match => match.substring(1));
    }

    return [];
};

commentSchema.statics.getCommentThread = async function (rootCommentId) {
    return await this.find({
        $or: [
            { _id: rootCommentId },
            { 'thread.rootComment': rootCommentId }
        ]
    })
        .populate('author', 'firstName lastName email avatar')
        .populate('replies')
        .sort({ 'thread.level': 1, createdAt: 1 });
};

commentSchema.statics.getEntityComments = async function (entityType, entityId, options = {}) {
    const query = {
        entityType,
        entityId,
        isDeleted: false,
        parentComment: { $exists: false }
    };

    const comments = await this.find(query)
        .populate('author', 'firstName lastName email avatar')
        .populate({
            path: 'replies',
            populate: {
                path: 'author',
                select: 'firstName lastName email avatar'
            }
        })
        .sort(options.sort || { 'metadata.isPinned': -1, createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);

    return comments;
};

module.exports = mongoose.model('Comment', commentSchema);