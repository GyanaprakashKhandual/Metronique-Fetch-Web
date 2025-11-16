const { getIO, emitToRoom } = require('../config/socket.config');
const Project = require('../models/project.model');
const TestFile = require('../models/test.file.model');

const initializeCollaborationSocket = (io) => {
    console.log('[Collaboration Socket] Initializing collaboration socket handlers');

    const activeUsers = new Map();
    const activeEditors = new Map();

    io.on('connection', (socket) => {
        console.log('[Collaboration Socket] Client connected to collaboration');
        console.log('[Collaboration Socket] Socket ID:', socket.id);
        console.log('[Collaboration Socket] User ID:', socket.userId);

        socket.on('collaboration:join:project', async (data) => {
            try {
                console.log('[Collaboration Socket] Join project request');
                console.log('[Collaboration Socket] Project ID:', data.projectId);
                console.log('[Collaboration Socket] User ID:', socket.userId);

                const project = await Project.findById(data.projectId);

                if (!project) {
                    console.error('[Collaboration Socket] Project not found:', data.projectId);
                    socket.emit('collaboration:error', {
                        message: 'Project not found',
                        projectId: data.projectId
                    });
                    return;
                }

                const hasAccess = await project.hasAccess(socket.userId);
                if (!hasAccess) {
                    console.error('[Collaboration Socket] Access denied for user:', socket.userId);
                    socket.emit('collaboration:error', {
                        message: 'Access denied',
                        projectId: data.projectId
                    });
                    return;
                }

                const roomId = `collaboration:project:${data.projectId}`;
                socket.join(roomId);

                if (!activeUsers.has(roomId)) {
                    activeUsers.set(roomId, new Set());
                }
                activeUsers.get(roomId).add(socket.userId);

                console.log('[Collaboration Socket] User joined project collaboration');
                console.log('[Collaboration Socket] Room ID:', roomId);
                console.log('[Collaboration Socket] Active users:', activeUsers.get(roomId).size);

                socket.to(roomId).emit('collaboration:user:joined', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    timestamp: new Date().toISOString()
                });

                socket.emit('collaboration:joined', {
                    projectId: data.projectId,
                    roomId: roomId,
                    activeUsers: Array.from(activeUsers.get(roomId))
                });

            } catch (error) {
                console.error('[Collaboration Socket] Join project error:', error.message);
                socket.emit('collaboration:error', {
                    message: 'Failed to join project collaboration',
                    error: error.message
                });
            }
        });

        socket.on('collaboration:leave:project', (data) => {
            try {
                console.log('[Collaboration Socket] Leave project request');
                console.log('[Collaboration Socket] Project ID:', data.projectId);

                const roomId = `collaboration:project:${data.projectId}`;

                if (activeUsers.has(roomId)) {
                    activeUsers.get(roomId).delete(socket.userId);

                    console.log('[Collaboration Socket] User left project collaboration');
                    console.log('[Collaboration Socket] Remaining users:', activeUsers.get(roomId).size);
                }

                socket.to(roomId).emit('collaboration:user:left', {
                    userId: socket.userId,
                    timestamp: new Date().toISOString()
                });

                socket.leave(roomId);

                socket.emit('collaboration:left', {
                    projectId: data.projectId
                });

            } catch (error) {
                console.error('[Collaboration Socket] Leave project error:', error.message);
            }
        });

        socket.on('collaboration:cursor:move', (data) => {
            try {
                console.log('[Collaboration Socket] Cursor move event');
                console.log('[Collaboration Socket] File ID:', data.fileId);
                console.log('[Collaboration Socket] Position:', data.position);

                const roomId = `collaboration:file:${data.fileId}`;

                socket.to(roomId).emit('collaboration:cursor:update', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    fileId: data.fileId,
                    position: data.position,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('[Collaboration Socket] Cursor move error:', error.message);
            }
        });

        socket.on('collaboration:selection:change', (data) => {
            try {
                console.log('[Collaboration Socket] Selection change event');
                console.log('[Collaboration Socket] File ID:', data.fileId);
                console.log('[Collaboration Socket] Selection range:', data.selection);

                const roomId = `collaboration:file:${data.fileId}`;

                socket.to(roomId).emit('collaboration:selection:update', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    fileId: data.fileId,
                    selection: data.selection,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('[Collaboration Socket] Selection change error:', error.message);
            }
        });

        socket.on('collaboration:awareness:update', (data) => {
            try {
                console.log('[Collaboration Socket] Awareness update');
                console.log('[Collaboration Socket] Project ID:', data.projectId);
                console.log('[Collaboration Socket] Status:', data.status);

                const roomId = `collaboration:project:${data.projectId}`;

                socket.to(roomId).emit('collaboration:awareness', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    status: data.status,
                    activity: data.activity,
                    currentFile: data.currentFile,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('[Collaboration Socket] Awareness update error:', error.message);
            }
        });

        socket.on('collaboration:typing:start', (data) => {
            try {
                console.log('[Collaboration Socket] Typing started');
                console.log('[Collaboration Socket] File ID:', data.fileId);

                const roomId = `collaboration:file:${data.fileId}`;

                socket.to(roomId).emit('collaboration:user:typing', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    fileId: data.fileId,
                    isTyping: true,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('[Collaboration Socket] Typing start error:', error.message);
            }
        });

        socket.on('collaboration:typing:stop', (data) => {
            try {
                console.log('[Collaboration Socket] Typing stopped');
                console.log('[Collaboration Socket] File ID:', data.fileId);

                const roomId = `collaboration:file:${data.fileId}`;

                socket.to(roomId).emit('collaboration:user:typing', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    fileId: data.fileId,
                    isTyping: false,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('[Collaboration Socket] Typing stop error:', error.message);
            }
        });

        socket.on('collaboration:comment:add', async (data) => {
            try {
                console.log('[Collaboration Socket] Comment added');
                console.log('[Collaboration Socket] File ID:', data.fileId);
                console.log('[Collaboration Socket] Comment:', data.comment);

                const roomId = `collaboration:file:${data.fileId}`;

                io.to(roomId).emit('collaboration:comment:new', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    fileId: data.fileId,
                    comment: data.comment,
                    line: data.line,
                    timestamp: new Date().toISOString()
                });

                console.log('[Collaboration Socket] Comment broadcasted');

            } catch (error) {
                console.error('[Collaboration Socket] Add comment error:', error.message);
            }
        });

        socket.on('collaboration:file:lock:request', async (data) => {
            try {
                console.log('[Collaboration Socket] File lock requested');
                console.log('[Collaboration Socket] File ID:', data.fileId);
                console.log('[Collaboration Socket] User ID:', socket.userId);

                const file = await TestFile.findById(data.fileId);

                if (!file) {
                    socket.emit('collaboration:file:lock:denied', {
                        fileId: data.fileId,
                        reason: 'File not found'
                    });
                    return;
                }

                if (file.isLocked() && file.lockedBy.toString() !== socket.userId) {
                    console.log('[Collaboration Socket] File already locked by another user');
                    socket.emit('collaboration:file:lock:denied', {
                        fileId: data.fileId,
                        lockedBy: file.lockedBy,
                        reason: 'File locked by another user'
                    });
                    return;
                }

                await file.lock(socket.userId);

                const roomId = `collaboration:file:${data.fileId}`;

                socket.emit('collaboration:file:lock:granted', {
                    fileId: data.fileId,
                    timestamp: new Date().toISOString()
                });

                socket.to(roomId).emit('collaboration:file:locked', {
                    fileId: data.fileId,
                    lockedBy: socket.userId,
                    timestamp: new Date().toISOString()
                });
                console.log('[Collaboration Socket] File lock granted');

            } catch (error) {
                console.error('[Collaboration Socket] File lock error:', error.message);
                socket.emit('collaboration:file:lock:denied', {
                    fileId: data.fileId,
                    reason: error.message
                });
            }
        });

        socket.on('collaboration:file:unlock', async (data) => {
            try {
                console.log('[Collaboration Socket] File unlock requested');
                console.log('[Collaboration Socket] File ID:', data.fileId);

                const file = await TestFile.findById(data.fileId);

                if (file && file.lockedBy && file.lockedBy.toString() === socket.userId) {
                    await file.unlock();

                    const roomId = `collaboration:file:${data.fileId}`;

                    io.to(roomId).emit('collaboration:file:unlocked', {
                        fileId: data.fileId,
                        unlockedBy: socket.userId,
                        timestamp: new Date().toISOString()
                    });

                    console.log('[Collaboration Socket] File unlocked successfully');
                }

            } catch (error) {
                console.error('[Collaboration Socket] File unlock error:', error.message);
            }
        });

        socket.on('disconnect', async () => {
            console.log('[Collaboration Socket] Client disconnected from collaboration');
            console.log('[Collaboration Socket] Socket ID:', socket.id);
            console.log('[Collaboration Socket] User ID:', socket.userId);

            try {
                activeUsers.forEach((users, roomId) => {
                    if (users.has(socket.userId)) {
                        users.delete(socket.userId);
                        socket.to(roomId).emit('collaboration:user:left', {
                            userId: socket.userId,
                            timestamp: new Date().toISOString()
                        });
                    }
                });

                const lockedFiles = await TestFile.find({ lockedBy: socket.userId });
                for (const file of lockedFiles) {
                    await file.unlock();
                    const roomId = `collaboration:file:${file._id}`;
                    io.to(roomId).emit('collaboration:file:unlocked', {
                        fileId: file._id,
                        unlockedBy: socket.userId,
                        reason: 'User disconnected',
                        timestamp: new Date().toISOString()
                    });
                }

                console.log('[Collaboration Socket] Cleaned up user resources');

            } catch (error) {
                console.error('[Collaboration Socket] Disconnect cleanup error:', error.message);
            }
        });
    });

    console.log('[Collaboration Socket] Collaboration socket handlers initialized successfully');
};
const emitFileUpdate = (fileId, event, data) => {
    try {
        console.log('[Collaboration Socket] Emitting file update');
        console.log('[Collaboration Socket] File ID:', fileId);
        console.log('[Collaboration Socket] Event:', event);
        const roomId = `collaboration:file:${fileId}`;
        emitToRoom(roomId, event, {
            fileId,
            ...data,
            timestamp: new Date().toISOString()
        });

        console.log('[Collaboration Socket] File update emitted successfully');

    } catch (error) {
        console.error('[Collaboration Socket] Failed to emit file update');
        console.error('[Collaboration Socket] Error:', error.message);
    }
};
const notifyFileChanged = (fileId, userId, changes) => {
    emitFileUpdate(fileId, 'collaboration:file:changed', {
        changedBy: userId,
        changes
    });
};
const notifyFileSaved = (fileId, userId) => {
    emitFileUpdate(fileId, 'collaboration:file:saved', {
        savedBy: userId
    });
};
const notifyFileDeleted = (fileId, userId) => {
    emitFileUpdate(fileId, 'collaboration:file:deleted', {
        deletedBy: userId
    });
};
module.exports = {
    initializeCollaborationSocket,
    emitFileUpdate,
    notifyFileChanged,
    notifyFileSaved,
    notifyFileDeleted
};
