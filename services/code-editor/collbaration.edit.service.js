const TestFile = require('../../models/test.file.model');
const User = require('../../models/user.model');
const CodeChangeHistory = require('../../models/code.change.history.model');

class CollaborationEditService {
    constructor() {
        this.activeSessions = new Map();
        this.cursors = new Map();
        this.selections = new Map();
    }

    async joinEditSession(fileId, userId, socketId) {
        try {
            console.log(`[COLLABORATION_SERVICE] JOIN_SESSION | File: ${fileId} | User: ${userId} | Socket: ${socketId}`);

            const file = await TestFile.findById(fileId)
                .populate('lockedBy', 'firstName lastName email avatar');

            const user = await User.findById(userId)
                .select('firstName lastName email avatar');

            if (!file) {
                console.error(`[COLLABORATION_SERVICE] JOIN_SESSION_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            if (!this.activeSessions.has(fileId)) {
                this.activeSessions.set(fileId, new Map());
                console.log(`[COLLABORATION_SERVICE] SESSION_CREATED | File: ${fileId}`);
            }

            const fileSession = this.activeSessions.get(fileId);
            fileSession.set(userId, {
                userId,
                socketId,
                user: {
                    id: user._id,
                    name: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                    avatar: user.avatar
                },
                joinedAt: Date.now(),
                isActive: true
            });

            const activeUsers = Array.from(fileSession.values());

            console.log(`[COLLABORATION_SERVICE] JOIN_SESSION_SUCCESS | File: ${file.name} | Active Users: ${activeUsers.length}`);

            return {
                success: true,
                file: {
                    id: file._id,
                    name: file.name,
                    content: file.content,
                    isLocked: file.isLocked(),
                    lockedBy: file.lockedBy
                },
                session: {
                    fileId,
                    activeUsers,
                    userCount: activeUsers.length
                }
            };
        } catch (error) {
            console.error(`[COLLABORATION_SERVICE] JOIN_SESSION_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    async leaveEditSession(fileId, userId) {
        try {
            console.log(`[COLLABORATION_SERVICE] LEAVE_SESSION | File: ${fileId} | User: ${userId}`);

            if (!this.activeSessions.has(fileId)) {
                console.log(`[COLLABORATION_SERVICE] LEAVE_SESSION_INFO | No active session for file: ${fileId}`);
                return { success: true };
            }

            const fileSession = this.activeSessions.get(fileId);
            fileSession.delete(userId);

            this.cursors.delete(`${fileId}:${userId}`);
            this.selections.delete(`${fileId}:${userId}`);

            if (fileSession.size === 0) {
                this.activeSessions.delete(fileId);
                console.log(`[COLLABORATION_SERVICE] SESSION_CLOSED | File: ${fileId} | No active users remaining`);
            }

            const activeUsers = Array.from(fileSession.values());

            console.log(`[COLLABORATION_SERVICE] LEAVE_SESSION_SUCCESS | File: ${fileId} | Remaining Users: ${activeUsers.length}`);

            return {
                success: true,
                session: {
                    fileId,
                    activeUsers,
                    userCount: activeUsers.length
                }
            };
        } catch (error) {
            console.error(`[COLLABORATION_SERVICE] LEAVE_SESSION_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    async broadcastChange(fileId, userId, change) {
        try {
            console.log(`[COLLABORATION_SERVICE] BROADCAST_CHANGE | File: ${fileId} | User: ${userId} | Type: ${change.type}`);

            if (!this.activeSessions.has(fileId)) {
                console.log(`[COLLABORATION_SERVICE] BROADCAST_CHANGE_INFO | No active session for file: ${fileId}`);
                return { success: true, recipients: [] };
            }

            const fileSession = this.activeSessions.get(fileId);
            const recipients = [];

            fileSession.forEach((session, sessionUserId) => {
                if (sessionUserId !== userId) {
                    recipients.push({
                        userId: sessionUserId,
                        socketId: session.socketId
                    });
                }
            });

            console.log(`[COLLABORATION_SERVICE] BROADCAST_CHANGE_SUCCESS | File: ${fileId} | Recipients: ${recipients.length} | Change Type: ${change.type}`);

            return {
                success: true,
                recipients,
                change: {
                    fileId,
                    userId,
                    type: change.type,
                    data: change.data,
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            console.error(`[COLLABORATION_SERVICE] BROADCAST_CHANGE_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    async applyChange(fileId, userId, change) {
        try {
            console.log(`[COLLABORATION_SERVICE] APPLY_CHANGE | File: ${fileId} | User: ${userId} | Type: ${change.type}`);

            const file = await TestFile.findById(fileId);

            if (!file) {
                console.error(`[COLLABORATION_SERVICE] APPLY_CHANGE_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            if (file.isLocked() && file.lockedBy.toString() !== userId) {
                console.error(`[COLLABORATION_SERVICE] APPLY_CHANGE_ERROR | File locked by another user: ${fileId}`);
                throw new Error('File is locked by another user');
            }

            let newContent = file.content;

            switch (change.type) {
                case 'insert':
                    newContent = this.applyInsert(file.content, change.position, change.text);
                    break;

                case 'delete':
                    newContent = this.applyDelete(file.content, change.range);
                    break;

                case 'replace':
                    newContent = this.applyReplace(file.content, change.range, change.text);
                    break;

                default:
                    console.error(`[COLLABORATION_SERVICE] APPLY_CHANGE_ERROR | Unknown change type: ${change.type}`);
                    throw new Error(`Unknown change type: ${change.type}`);
            }

            await file.updateContent(newContent, userId);

            await CodeChangeHistory.create({
                file: fileId,
                project: file.project,
                changeType: 'modified',
                action: `Content ${change.type}`,
                description: `Collaborative edit: ${change.type}`,
                changes: {
                    before: { content: file.content },
                    after: { content: newContent },
                    linesAdded: 0,
                    linesRemoved: 0,
                    linesModified: 1
                },
                createdBy: userId
            });

            console.log(`[COLLABORATION_SERVICE] APPLY_CHANGE_SUCCESS | File: ${file.name} | Change Type: ${change.type} | New Size: ${newContent.length}`);

            return {
                success: true,
                file: {
                    id: file._id,
                    content: newContent,
                    size: file.size,
                    lines: file.lines,
                    version: file.version.current
                }
            };
        } catch (error) {
            console.error(`[COLLABORATION_SERVICE] APPLY_CHANGE_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    applyInsert(content, position, text) {
        console.log(`[COLLABORATION_SERVICE] APPLY_INSERT | Position: Line ${position.line}, Col ${position.column} | Text Length: ${text.length}`);

        const lines = content.split('\n');

        if (position.line > lines.length) {
            position.line = lines.length;
        }

        const line = lines[position.line] || '';
        const before = line.substring(0, position.column);
        const after = line.substring(position.column);

        lines[position.line] = before + text + after;

        return lines.join('\n');
    }

    applyDelete(content, range) {
        console.log(`[COLLABORATION_SERVICE] APPLY_DELETE | Range: Line ${range.start.line}:${range.start.column} to Line ${range.end.line}:${range.end.column}`);

        const lines = content.split('\n');

        if (range.start.line === range.end.line) {
            const line = lines[range.start.line] || '';
            const before = line.substring(0, range.start.column);
            const after = line.substring(range.end.column);
            lines[range.start.line] = before + after;
        } else {
            const firstLine = lines[range.start.line] || '';
            const lastLine = lines[range.end.line] || '';
            const before = firstLine.substring(0, range.start.column);
            const after = lastLine.substring(range.end.column);

            lines.splice(range.start.line, range.end.line - range.start.line + 1, before + after);
        }

        return lines.join('\n');
    }

    applyReplace(content, range, text) {
        console.log(`[COLLABORATION_SERVICE] APPLY_REPLACE | Range: Line ${range.start.line}:${range.start.column} to Line ${range.end.line}:${range.end.column} | Text Length: ${text.length}`);

        const afterDelete = this.applyDelete(content, range);
        return this.applyInsert(afterDelete, range.start, text);
    }

    async updateCursor(fileId, userId, position) {
        try {
            const cursorKey = `${fileId}:${userId}`;

            this.cursors.set(cursorKey, {
                userId,
                position,
                timestamp: Date.now()
            });

            console.log(`[COLLABORATION_SERVICE] UPDATE_CURSOR | File: ${fileId} | User: ${userId} | Position: Line ${position.line}, Col ${position.column}`);

            const fileCursors = this.getFileCursors(fileId);

            return {
                success: true,
                cursors: fileCursors.filter(c => c.userId !== userId)
            };
        } catch (error) {
            console.error(`[COLLABORATION_SERVICE] UPDATE_CURSOR_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    async updateSelection(fileId, userId, selection) {
        try {
            const selectionKey = `${fileId}:${userId}`;

            this.selections.set(selectionKey, {
                userId,
                selection,
                timestamp: Date.now()
            });

            console.log(`[COLLABORATION_SERVICE] UPDATE_SELECTION | File: ${fileId} | User: ${userId} | Selection: Line ${selection.start.line}:${selection.start.column} to Line ${selection.end.line}:${selection.end.column}`);

            const fileSelections = this.getFileSelections(fileId);

            return {
                success: true,
                selections: fileSelections.filter(s => s.userId !== userId)
            };
        } catch (error) {
            console.error(`[COLLABORATION_SERVICE] UPDATE_SELECTION_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    getFileCursors(fileId) {
        const cursors = [];

        this.cursors.forEach((cursor, key) => {
            if (key.startsWith(`${fileId}:`)) {
                cursors.push(cursor);
            }
        });

        return cursors;
    }

    getFileSelections(fileId) {
        const selections = [];

        this.selections.forEach((selection, key) => {
            if (key.startsWith(`${fileId}:`)) {
                selections.push(selection);
            }
        });

        return selections;
    }

    async getActiveUsers(fileId) {
        try {
            console.log(`[COLLABORATION_SERVICE] GET_ACTIVE_USERS | File: ${fileId}`);

            if (!this.activeSessions.has(fileId)) {
                console.log(`[COLLABORATION_SERVICE] GET_ACTIVE_USERS_INFO | No active session for file: ${fileId}`);
                return {
                    success: true,
                    activeUsers: [],
                    userCount: 0
                };
            }

            const fileSession = this.activeSessions.get(fileId);
            const activeUsers = Array.from(fileSession.values());

            console.log(`[COLLABORATION_SERVICE] GET_ACTIVE_USERS_SUCCESS | File: ${fileId} | Active Users: ${activeUsers.length}`);

            return {
                success: true,
                activeUsers,
                userCount: activeUsers.length
            };
        } catch (error) {
            console.error(`[COLLABORATION_SERVICE] GET_ACTIVE_USERS_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    async requestFileLock(fileId, userId) {
        try {
            console.log(`[COLLABORATION_SERVICE] REQUEST_LOCK | File: ${fileId} | User: ${userId}`);

            const file = await TestFile.findById(fileId);

            if (!file) {
                console.error(`[COLLABORATION_SERVICE] REQUEST_LOCK_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            if (file.isLocked() && file.lockedBy.toString() !== userId) {
                const lockedByUser = await User.findById(file.lockedBy).select('firstName lastName email');

                console.error(`[COLLABORATION_SERVICE] REQUEST_LOCK_ERROR | File already locked | File: ${fileId} | Locked By: ${file.lockedBy}`);

                throw new Error(`File is locked by ${lockedByUser.firstName} ${lockedByUser.lastName}`);
            }

            await file.lock(userId);

            console.log(`[COLLABORATION_SERVICE] REQUEST_LOCK_SUCCESS | File: ${file.name} | Locked By: ${userId}`);

            return {
                success: true,
                locked: true,
                lockedBy: userId,
                lockedAt: file.lockedAt
            };
        } catch (error) {
            console.error(`[COLLABORATION_SERVICE] REQUEST_LOCK_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    async releaseFileLock(fileId, userId) {
        try {
            console.log(`[COLLABORATION_SERVICE] RELEASE_LOCK | File: ${fileId} | User: ${userId}`);

            const file = await TestFile.findById(fileId);

            if (!file) {
                console.error(`[COLLABORATION_SERVICE] RELEASE_LOCK_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            if (file.isLocked() && file.lockedBy.toString() !== userId) {
                console.error(`[COLLABORATION_SERVICE] RELEASE_LOCK_ERROR | User cannot unlock file | File: ${fileId} | User: ${userId}`);
                throw new Error('You cannot unlock a file locked by another user');
            }

            await file.unlock();

            console.log(`[COLLABORATION_SERVICE] RELEASE_LOCK_SUCCESS | File: ${file.name}`);

            return {
                success: true,
                locked: false
            };
        } catch (error) {
            console.error(`[COLLABORATION_SERVICE] RELEASE_LOCK_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    async getSessionStats() {
        console.log(`[COLLABORATION_SERVICE] GET_SESSION_STATS`);

        const stats = {
            totalActiveSessions: this.activeSessions.size,
            totalActiveUsers: 0,
            files: []
        };

        this.activeSessions.forEach((fileSession, fileId) => {
            stats.totalActiveUsers += fileSession.size;
            stats.files.push({
                fileId,
                activeUsers: fileSession.size,
                users: Array.from(fileSession.values()).map(u => u.user)
            });
        });

        console.log(`[COLLABORATION_SERVICE] GET_SESSION_STATS_SUCCESS | Sessions: ${stats.totalActiveSessions} | Users: ${stats.totalActiveUsers}`);

        return stats;
    }

    cleanupInactiveSessions(timeout = 3600000) {
        console.log(`[COLLABORATION_SERVICE] CLEANUP_SESSIONS | Timeout: ${timeout}ms`);

        const now = Date.now();
        let cleanedSessions = 0;
        let cleanedUsers = 0;

        this.activeSessions.forEach((fileSession, fileId) => {
            fileSession.forEach((session, userId) => {
                if (now - session.joinedAt > timeout) {
                    fileSession.delete(userId);
                    this.cursors.delete(`${fileId}:${userId}`);
                    this.selections.delete(`${fileId}:${userId}`);
                    cleanedUsers++;
                }
            });

            if (fileSession.size === 0) {
                this.activeSessions.delete(fileId);
                cleanedSessions++;
            }
        });

        console.log(`[COLLABORATION_SERVICE] CLEANUP_SESSIONS_SUCCESS | Cleaned Sessions: ${cleanedSessions} | Cleaned Users: ${cleanedUsers}`);

        return {
            cleanedSessions,
            cleanedUsers
        };
    }
}

module.exports = new CollaborationEditService();