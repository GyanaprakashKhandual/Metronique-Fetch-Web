const mongoose = require('mongoose');
const TeamMember = require('../models/team.member.model');
const Team = require('../models/team.model');
const Comment = require('../models/comment.model');
const AuditLog = require('../models/audit.log.model');
const Notification = require('../models/notification.model');

class CollaborationService {
    async addComment(entityType, entityId, content, authorId, teamId, metadata = {}) {
        console.log(`[CollaborationService] Adding comment to ${entityType} ${entityId} by user ${authorId}`);

        try {
            const comment = new Comment({
                project: teamId,
                entityType,
                entityId,
                content,
                author: authorId,
                formatting: {
                    isMarkdown: true,
                    isCode: false
                }
            });

            await comment.save();

            const mentions = comment.extractMentions();

            if (mentions.length > 0) {
                await this.handleMentions(comment, mentions, authorId, teamId);
            }

            await AuditLog.create({
                user: authorId,
                action: 'comment_created',
                actionCategory: 'collaboration',
                entityType: 'comment',
                entityId: comment._id,
                status: 'success',
                severity: 'info',
                details: {
                    description: 'Comment added',
                    targetEntity: entityType,
                    targetId: entityId
                },
                ...metadata
            });

            console.log(`[CollaborationService] Comment created successfully: ${comment._id}`);
            return comment;
        } catch (error) {
            console.error(`[CollaborationService] Error adding comment:`, error);
            throw error;
        }
    }

    async replyToComment(rootCommentId, content, authorId, teamId, metadata = {}) {
        console.log(`[CollaborationService] Adding reply to comment ${rootCommentId}`);

        try {
            const rootComment = await Comment.findById(rootCommentId);

            if (!rootComment) {
                throw new Error('Parent comment not found');
            }

            const reply = new Comment({
                project: teamId,
                entityType: rootComment.entityType,
                entityId: rootComment.entityId,
                content,
                author: authorId,
                parentComment: rootCommentId,
                thread: {
                    isThread: true,
                    level: (rootComment.thread.level || 0) + 1,
                    rootComment: rootComment.thread.rootComment || rootCommentId
                },
                formatting: {
                    isMarkdown: true
                }
            });

            await reply.save();
            await rootComment.addReply(reply._id);

            const mentions = reply.extractMentions();

            if (mentions.length > 0) {
                await this.handleMentions(reply, mentions, authorId, teamId);
            }

            await AuditLog.create({
                user: authorId,
                action: 'comment_created',
                actionCategory: 'collaboration',
                entityType: 'comment',
                entityId: reply._id,
                status: 'success',
                severity: 'info',
                details: {
                    description: 'Reply added to comment',
                    parentCommentId: rootCommentId
                },
                ...metadata
            });

            console.log(`[CollaborationService] Reply created successfully: ${reply._id}`);
            return reply;
        } catch (error) {
            console.error(`[CollaborationService] Error replying to comment:`, error);
            throw error;
        }
    }

    async editComment(commentId, newContent, editorId, metadata = {}) {
        console.log(`[CollaborationService] Editing comment ${commentId}`);

        try {
            const comment = await Comment.findById(commentId);

            if (!comment) {
                throw new Error('Comment not found');
            }

            if (comment.author.toString() !== editorId.toString()) {
                throw new Error('Unauthorized to edit this comment');
            }

            const before = comment.content;
            await comment.edit(newContent, editorId, metadata.reason || 'User edit');

            await AuditLog.create({
                user: editorId,
                action: 'comment_updated',
                actionCategory: 'collaboration',
                entityType: 'comment',
                entityId: commentId,
                status: 'success',
                severity: 'info',
                changes: { before, after: newContent },
                ...metadata
            });

            console.log(`[CollaborationService] Comment edited successfully: ${commentId}`);
            return comment;
        } catch (error) {
            console.error(`[CollaborationService] Error editing comment:`, error);
            throw error;
        }
    }

    async deleteComment(commentId, deleterId, metadata = {}) {
        console.log(`[CollaborationService] Deleting comment ${commentId}`);

        try {
            const comment = await Comment.findById(commentId);

            if (!comment) {
                throw new Error('Comment not found');
            }

            const deleter = await TeamMember.findOne({ user: deleterId });

            if (comment.author.toString() !== deleterId.toString() && !deleter?.hasPermission('canManageTeam')) {
                throw new Error('Unauthorized to delete this comment');
            }

            await comment.softDelete(deleterId, metadata.reason || 'User deletion');

            if (comment.parentComment) {
                const parent = await Comment.findById(comment.parentComment);
                if (parent) {
                    await parent.removeReply(commentId);
                }
            }

            await AuditLog.create({
                user: deleterId,
                action: 'comment_deleted',
                actionCategory: 'collaboration',
                entityType: 'comment',
                entityId: commentId,
                status: 'success',
                severity: 'info',
                details: { reason: metadata.reason },
                ...metadata
            });

            console.log(`[CollaborationService] Comment deleted successfully: ${commentId}`);
            return comment;
        } catch (error) {
            console.error(`[CollaborationService] Error deleting comment:`, error);
            throw error;
        }
    }

    async addReaction(commentId, userId, reactionType, metadata = {}) {
        console.log(`[CollaborationService] Adding ${reactionType} reaction to comment ${commentId}`);

        try {
            const comment = await Comment.findById(commentId);

            if (!comment) {
                throw new Error('Comment not found');
            }

            await comment.addReaction(userId, reactionType);

            await AuditLog.create({
                user: userId,
                action: 'reaction_added',
                actionCategory: 'collaboration',
                entityType: 'comment',
                entityId: commentId,
                status: 'success',
                severity: 'info',
                details: { reactionType },
                ...metadata
            });

            console.log(`[CollaborationService] Reaction added successfully to comment ${commentId}`);
            return comment;
        } catch (error) {
            console.error(`[CollaborationService] Error adding reaction:`, error);
            throw error;
        }
    }

    async removeReaction(commentId, userId, metadata = {}) {
        console.log(`[CollaborationService] Removing reaction from comment ${commentId}`);

        try {
            const comment = await Comment.findById(commentId);

            if (!comment) {
                throw new Error('Comment not found');
            }

            await comment.removeReaction(userId);

            await AuditLog.create({
                user: userId,
                action: 'reaction_removed',
                actionCategory: 'collaboration',
                entityType: 'comment',
                entityId: commentId,
                status: 'success',
                severity: 'info',
                ...metadata
            });

            console.log(`[CollaborationService] Reaction removed successfully from comment ${commentId}`);
            return comment;
        } catch (error) {
            console.error(`[CollaborationService] Error removing reaction:`, error);
            throw error;
        }
    }

    async pinComment(commentId, pinnedById, metadata = {}) {
        console.log(`[CollaborationService] Pinning comment ${commentId}`);

        try {
            const comment = await Comment.findById(commentId);

            if (!comment) {
                throw new Error('Comment not found');
            }

            await comment.pin(pinnedById);

            await AuditLog.create({
                user: pinnedById,
                action: 'comment_pinned',
                actionCategory: 'collaboration',
                entityType: 'comment',
                entityId: commentId,
                status: 'success',
                severity: 'info',
                ...metadata
            });

            console.log(`[CollaborationService] Comment pinned successfully: ${commentId}`);
            return comment;
        } catch (error) {
            console.error(`[CollaborationService] Error pinning comment:`, error);
            throw error;
        }
    }

    async unpinComment(commentId, unpinnedById, metadata = {}) {
        console.log(`[CollaborationService] Unpinning comment ${commentId}`);

        try {
            const comment = await Comment.findById(commentId);

            if (!comment) {
                throw new Error('Comment not found');
            }

            await comment.unpin();

            await AuditLog.create({
                user: unpinnedById,
                action: 'comment_unpinned',
                actionCategory: 'collaboration',
                entityType: 'comment',
                entityId: commentId,
                status: 'success',
                severity: 'info',
                ...metadata
            });

            console.log(`[CollaborationService] Comment unpinned successfully: ${commentId}`);
            return comment;
        } catch (error) {
            console.error(`[CollaborationService] Error unpinning comment:`, error);
            throw error;
        }
    }

    async resolveComment(commentId, resolvedById, metadata = {}) {
        console.log(`[CollaborationService] Resolving comment ${commentId}`);

        try {
            const comment = await Comment.findById(commentId);

            if (!comment) {
                throw new Error('Comment not found');
            }

            await comment.resolve(resolvedById);

            await AuditLog.create({
                user: resolvedById,
                action: 'comment_resolved',
                actionCategory: 'collaboration',
                entityType: 'comment',
                entityId: commentId,
                status: 'success',
                severity: 'info',
                ...metadata
            });

            console.log(`[CollaborationService] Comment resolved successfully: ${commentId}`);
            return comment;
        } catch (error) {
            console.error(`[CollaborationService] Error resolving comment:`, error);
            throw error;
        }
    }

    async getEntityComments(entityType, entityId, options = {}) {
        console.log(`[CollaborationService] Fetching comments for ${entityType} ${entityId}`);

        try {
            const comments = await Comment.getEntityComments(entityType, entityId, {
                sort: options.sort || { 'metadata.isPinned': -1, createdAt: -1 },
                limit: options.limit || 50,
                skip: options.skip || 0
            });

            const total = await Comment.countDocuments({
                entityType,
                entityId,
                isDeleted: false,
                parentComment: { $exists: false }
            });

            console.log(`[CollaborationService] Found ${comments.length} comments for ${entityType} ${entityId}`);
            return { comments, total };
        } catch (error) {
            console.error(`[CollaborationService] Error fetching entity comments:`, error);
            throw error;
        }
    }

    async getCommentThread(rootCommentId, options = {}) {
        console.log(`[CollaborationService] Fetching thread for comment ${rootCommentId}`);

        try {
            const thread = await Comment.getCommentThread(rootCommentId);

            console.log(`[CollaborationService] Thread with ${thread.length} comments retrieved`);
            return thread;
        } catch (error) {
            console.error(`[CollaborationService] Error fetching comment thread:`, error);
            throw error;
        }
    }

    async handleMentions(comment, mentions, authorId, teamId) {
        console.log(`[CollaborationService] Processing ${mentions.length} mentions in comment`);

        try {
            for (const username of mentions) {
                const mentionedUser = await require('../models/user.model').findOne({ username });

                if (mentionedUser && mentionedUser._id.toString() !== authorId.toString()) {
                    comment.mentions.push({
                        user: mentionedUser._id,
                        username,
                        notified: false
                    });

                    await Notification.create({
                        user: mentionedUser._id,
                        type: 'mention',
                        relatedEntity: {
                            entityType: 'comment',
                            entityId: comment._id
                        },
                        content: `You were mentioned in a comment`,
                        read: false
                    });
                }
            }

            await comment.save();
            console.log(`[CollaborationService] Mentions processed successfully`);
        } catch (error) {
            console.error(`[CollaborationService] Error handling mentions:`, error);
        }
    }

    async flagComment(commentId, userId, reason, description, metadata = {}) {
        console.log(`[CollaborationService] Flagging comment ${commentId} for ${reason}`);

        try {
            const comment = await Comment.findById(commentId);

            if (!comment) {
                throw new Error('Comment not found');
            }

            await comment.flag(userId, reason, description);

            await AuditLog.create({
                user: userId,
                action: 'comment_flagged',
                actionCategory: 'collaboration',
                entityType: 'comment',
                entityId: commentId,
                status: 'success',
                severity: 'warning',
                details: { reason, description },
                ...metadata
            });

            console.log(`[CollaborationService] Comment flagged successfully: ${commentId}`);
            return comment;
        } catch (error) {
            console.error(`[CollaborationService] Error flagging comment:`, error);
            throw error;
        }
    }

    async reviewFlag(commentId, flagId, reviewerId, action, metadata = {}) {
        console.log(`[CollaborationService] Reviewing flag ${flagId} on comment ${commentId}`);

        try {
            const comment = await Comment.findById(commentId);

            if (!comment) {
                throw new Error('Comment not found');
            }

            await comment.reviewFlag(flagId, reviewerId, action);

            await AuditLog.create({
                user: reviewerId,
                action: 'flag_reviewed',
                actionCategory: 'collaboration',
                entityType: 'comment',
                entityId: commentId,
                status: 'success',
                severity: 'info',
                details: { action },
                ...metadata
            });

            console.log(`[CollaborationService] Flag reviewed successfully: ${flagId}`);
            return comment;
        } catch (error) {
            console.error(`[CollaborationService] Error reviewing flag:`, error);
            throw error;
        }
    }

    async getTeamCollaborationStats(teamId, days = 30) {
        console.log(`[CollaborationService] Fetching collaboration stats for team ${teamId}`);

        try {
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const stats = await Comment.aggregate([
                {
                    $match: {
                        project: mongoose.Types.ObjectId(teamId),
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalComments: { $sum: 1 },
                        totalAuthors: { $addToSet: '$author' },
                        totalReactions: { $sum: { $size: '$reactions' } },
                        totalReplies: {
                            $sum: {
                                $cond: [{ $eq: ['$parentComment', null] }, 0, 1]
                            }
                        }
                    }
                }
            ]);

            const result = stats[0] || {
                totalComments: 0,
                totalAuthors: [],
                totalReactions: 0,
                totalReplies: 0
            };

            result.totalAuthors = result.totalAuthors.length;

            console.log(`[CollaborationService] Collaboration stats retrieved for team ${teamId}`);
            return result;
        } catch (error) {
            console.error(`[CollaborationService] Error fetching collaboration stats:`, error);
            throw error;
        }
    }

    async incrementCommentViewCount(commentId) {
        console.log(`[CollaborationService] Incrementing view count for comment ${commentId}`);

        try {
            const comment = await Comment.findById(commentId);

            if (comment) {
                await comment.incrementViewCount();
            }

            return comment;
        } catch (error) {
            console.error(`[CollaborationService] Error incrementing view count:`, error);
            throw error;
        }
    }
}

module.exports = new CollaborationService();