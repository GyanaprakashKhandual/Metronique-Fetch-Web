const { getIO, emitToRoom } = require('../config/socket.config');
const TestFile = require('../models/test.file.model');
const Project = require('../models/project.model');

const initializeCodeEditorSocket = (io) => {
    console.log('[Code Editor Socket] Initializing code editor socket handlers');

    const editorSessions = new Map();
    const cursorPositions = new Map();

    io.on('connection', (socket) => {
        console.log('[Code Editor Socket] Client connected to code editor');
        console.log('[Code Editor Socket] Socket ID:', socket.id);
        console.log('[Code Editor Socket] User ID:', socket.userId);

        socket.on('editor:join', async (data) => {
            try {
                console.log('[Code Editor Socket] Join editor request');
                console.log('[Code Editor Socket] File ID:', data.fileId);
                console.log('[Code Editor Socket] User ID:', socket.userId);

                const file = await TestFile.findById(data.fileId).populate('project');

                if (!file) {
                    console.error('[Code Editor Socket] File not found:', data.fileId);
                    socket.emit('editor:error', {
                        message: 'File not found',
                        fileId: data.fileId
                    });
                    return;
                }

                const hasAccess = await file.project.hasAccess(socket.userId);
                if (!hasAccess) {
                    console.error('[Code Editor Socket] Access denied for user:', socket.userId);
                    socket.emit('editor:error', {
                        message: 'Access denied',
                        fileId: data.fileId
                    });
                    return;
                }

                const roomId = `editor:${data.fileId}`;
                socket.join(roomId);

                if (!editorSessions.has(roomId)) {
                    editorSessions.set(roomId, new Map());
                }

                editorSessions.get(roomId).set(socket.userId, {
                    socketId: socket.id,
                    userEmail: socket.userEmail,
                    joinedAt: new Date().toISOString()
                });

                console.log('[Code Editor Socket] User joined editor session');
                console.log('[Code Editor Socket] Room ID:', roomId);
                console.log('[Code Editor Socket] Active editors:', editorSessions.get(roomId).size);

                socket.to(roomId).emit('editor:user:joined', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    fileId: data.fileId,
                    timestamp: new Date().toISOString()
                });

                const activeSessions = Array.from(editorSessions.get(roomId).entries()).map(([userId, session]) => ({
                    userId,
                    ...session
                }));

                socket.emit('editor:joined', {
                    fileId: data.fileId,
                    roomId: roomId,
                    file: {
                        _id: file._id,
                        name: file.name,
                        content: file.content,
                        language: file.language,
                        isLocked: file.isLocked(),
                        lockedBy: file.lockedBy
                    },
                    activeEditors: activeSessions
                });

            } catch (error) {
                console.error('[Code Editor Socket] Join editor error:', error.message);
                socket.emit('editor:error', {
                    message: 'Failed to join editor',
                    error: error.message
                });
            }
        });

        socket.on('editor:leave', (data) => {
            try {
                console.log('[Code Editor Socket] Leave editor request');
                console.log('[Code Editor Socket] File ID:', data.fileId);

                const roomId = `editor:${data.fileId}`;

                if (editorSessions.has(roomId)) {
                    editorSessions.get(roomId).delete(socket.userId);
                    console.log('[Code Editor Socket] User left editor session');
                    console.log('[Code Editor Socket] Remaining editors:', editorSessions.get(roomId).size);
                }

                if (cursorPositions.has(roomId)) {
                    cursorPositions.get(roomId).delete(socket.userId);
                }

                socket.to(roomId).emit('editor:user:left', {
                    userId: socket.userId,
                    fileId: data.fileId,
                    timestamp: new Date().toISOString()
                });

                socket.leave(roomId);

            } catch (error) {
                console.error('[Code Editor Socket] Leave editor error:', error.message);
            }
        });

        socket.on('editor:change', async (data) => {
            try {
                console.log('[Code Editor Socket] Content change received');
                console.log('[Code Editor Socket] File ID:', data.fileId);
                console.log('[Code Editor Socket] Change type:', data.changeType);

                const roomId = `editor:${data.fileId}`;

                socket.to(roomId).emit('editor:remote:change', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    fileId: data.fileId,
                    changes: data.changes,
                    changeType: data.changeType,
                    position: data.position,
                    timestamp: new Date().toISOString()
                });

                console.log('[Code Editor Socket] Change broadcasted to room');

            } catch (error) {
                console.error('[Code Editor Socket] Content change error:', error.message);
            }
        });

        socket.on('editor:cursor:update', (data) => {
            try {
                console.log('[Code Editor Socket] Cursor update received');
                console.log('[Code Editor Socket] File ID:', data.fileId);
                console.log('[Code Editor Socket] Line:', data.position.line);

                const roomId = `editor:${data.fileId}`;

                if (!cursorPositions.has(roomId)) {
                    cursorPositions.set(roomId, new Map());
                }

                cursorPositions.get(roomId).set(socket.userId, {
                    position: data.position,
                    timestamp: new Date().toISOString()
                });

                socket.to(roomId).emit('editor:cursor:position', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    fileId: data.fileId,
                    position: data.position,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('[Code Editor Socket] Cursor update error:', error.message);
            }
        });

        socket.on('editor:selection:update', (data) => {
            try {
                console.log('[Code Editor Socket] Selection update received');
                console.log('[Code Editor Socket] File ID:', data.fileId);
                console.log('[Code Editor Socket] Selection:', data.selection);

                const roomId = `editor:${data.fileId}`;

                socket.to(roomId).emit('editor:selection:change', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    fileId: data.fileId,
                    selection: data.selection,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('[Code Editor Socket] Selection update error:', error.message);
            }
        });

        socket.on('editor:save', async (data) => {
            try {
                console.log('[Code Editor Socket] Save request received');
                console.log('[Code Editor Socket] File ID:', data.fileId);
                console.log('[Code Editor Socket] User ID:', socket.userId);

                const file = await TestFile.findById(data.fileId);

                if (!file) {
                    socket.emit('editor:save:error', {
                        message: 'File not found',
                        fileId: data.fileId
                    });
                    return;
                }

                if (!file.canEdit(socket.userId)) {
                    socket.emit('editor:save:error', {
                        message: 'No permission to edit file',
                        fileId: data.fileId
                    });
                    return;
                }

                await file.updateContent(data.content, socket.userId);

                const roomId = `editor:${data.fileId}`;

                socket.emit('editor:save:success', {
                    fileId: data.fileId,
                    version: file.version.current,
                    timestamp: new Date().toISOString()
                });

                socket.to(roomId).emit('editor:file:saved', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    fileId: data.fileId,
                    version: file.version.current,
                    timestamp: new Date().toISOString()
                });

                console.log('[Code Editor Socket] File saved successfully');

            } catch (error) {
                console.error('[Code Editor Socket] Save error:', error.message);
                socket.emit('editor:save:error', {
                    message: 'Failed to save file',
                    error: error.message,
                    fileId: data.fileId
                });
            }
        });

        socket.on('editor:format', (data) => {
            try {
                console.log('[Code Editor Socket] Format request received');
                console.log('[Code Editor Socket] File ID:', data.fileId);

                const roomId = `editor:${data.fileId}`;

                socket.to(roomId).emit('editor:file:formatting', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    fileId: data.fileId,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('[Code Editor Socket] Format error:', error.message);
            }
        });

        socket.on('editor:validate', async (data) => {
            try {
                console.log('[Code Editor Socket] Validation request received');
                console.log('[Code Editor Socket] File ID:', data.fileId);

                socket.emit('editor:validation:started', {
                    fileId: data.fileId,
                    timestamp: new Date().toISOString()
                });

                console.log('[Code Editor Socket] Validation started');

            } catch (error) {
                console.error('[Code Editor Socket] Validation error:', error.message);
            }
        });

        socket.on('editor:autocomplete:request', (data) => {
            try {
                console.log('[Code Editor Socket] Autocomplete request');
                console.log('[Code Editor Socket] File ID:', data.fileId);
                console.log('[Code Editor Socket] Position:', data.position);

                socket.emit('editor:autocomplete:processing', {
                    fileId: data.fileId,
                    position: data.position
                });

            } catch (error) {
                console.error('[Code Editor Socket] Autocomplete error:', error.message);
            }
        });

        socket.on('editor:typing:start', (data) => {
            try {
                console.log('[Code Editor Socket] Typing started');
                console.log('[Code Editor Socket] File ID:', data.fileId);

                const roomId = `editor:${data.fileId}`;

                socket.to(roomId).emit('editor:user:typing', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    fileId: data.fileId,
                    isTyping: true,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('[Code Editor Socket] Typing start error:', error.message);
            }
        });

        socket.on('editor:typing:stop', (data) => {
            try {
                console.log('[Code Editor Socket] Typing stopped');
                console.log('[Code Editor Socket] File ID:', data.fileId);

                const roomId = `editor:${data.fileId}`;

                socket.to(roomId).emit('editor:user:typing', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    fileId: data.fileId,
                    isTyping: false,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('[Code Editor Socket] Typing stop error:', error.message);
            }
        });

        socket.on('editor:undo', (data) => {
            try {
                console.log('[Code Editor Socket] Undo operation');
                console.log('[Code Editor Socket] File ID:', data.fileId);

                const roomId = `editor:${data.fileId}`;

                socket.to(roomId).emit('editor:operation:undo', {
                    userId: socket.userId,
                    fileId: data.fileId,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('[Code Editor Socket] Undo error:', error.message);
            }
        });

        socket.on('editor:redo', (data) => {
            try {
                console.log('[Code Editor Socket] Redo operation');
                console.log('[Code Editor Socket] File ID:', data.fileId);

                const roomId = `editor:${data.fileId}`;

                socket.to(roomId).emit('editor:operation:redo', {
                    userId: socket.userId,
                    fileId: data.fileId,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('[Code Editor Socket] Redo error:', error.message);
            }
        });

        socket.on('disconnect', async () => {
            console.log('[Code Editor Socket] Client disconnected from code editor');
            console.log('[Code Editor Socket] Socket ID:', socket.id);
            console.log('[Code Editor Socket] User ID:', socket.userId);

            try {
                editorSessions.forEach((sessions, roomId) => {
                    if (sessions.has(socket.userId)) {
                        sessions.delete(socket.userId);

                        socket.to(roomId).emit('editor:user:left', {
                            userId: socket.userId,
                            timestamp: new Date().toISOString()
                        });

                        console.log('[Code Editor Socket] Removed user from editor session:', roomId);
                    }
                });

                cursorPositions.forEach((cursors, roomId) => {
                    cursors.delete(socket.userId);
                });

                const lockedFiles = await TestFile.find({ lockedBy: socket.userId });
                for (const file of lockedFiles) {
                    await file.unlock();

                    const roomId = `editor:${file._id}`;
                    io.to(roomId).emit('editor:file:unlocked', {
                        fileId: file._id,
                        unlockedBy: socket.userId,
                        reason: 'User disconnected',
                        timestamp: new Date().toISOString()
                    });

                    console.log('[Code Editor Socket] Unlocked file on disconnect:', file._id);
                }

            } catch (error) {
                console.error('[Code Editor Socket] Disconnect cleanup error:', error.message);
            }
        });
    });

    console.log('[Code Editor Socket] Code editor socket handlers initialized successfully');
};

const emitContentUpdate = (fileId, userId, changes) => {
    try {
        console.log('[Code Editor Socket] Emitting content update');
        console.log('[Code Editor Socket] File ID:', fileId);
        console.log('[Code Editor Socket] User ID:', userId);

        const roomId = `editor:${fileId}`;
        emitToRoom(roomId, 'editor:content:updated', {
            fileId,
            userId,
            changes,
            timestamp: new Date().toISOString()
        });

        console.log('[Code Editor Socket] Content update emitted successfully');

    } catch (error) {
        console.error('[Code Editor Socket] Failed to emit content update');
        console.error('[Code Editor Socket] Error:', error.message);
    }
};

const emitFileLocked = (fileId, userId) => {
    try {
        console.log('[Code Editor Socket] Emitting file locked event');
        console.log('[Code Editor Socket] File ID:', fileId);
        console.log('[Code Editor Socket] Locked by:', userId);

        const roomId = `editor:${fileId}`;
        emitToRoom(roomId, 'editor:file:locked', {
            fileId,
            lockedBy: userId,
            timestamp: new Date().toISOString()
        });

        console.log('[Code Editor Socket] File locked event emitted');

    } catch (error) {
        console.error('[Code Editor Socket] Failed to emit file locked event');
        console.error('[Code Editor Socket] Error:', error.message);
    }
};

const emitFileUnlocked = (fileId, userId) => {
    try {
        console.log('[Code Editor Socket] Emitting file unlocked event');
        console.log('[Code Editor Socket] File ID:', fileId);
        console.log('[Code Editor Socket] Unlocked by:', userId);

        const roomId = `editor:${fileId}`;
        emitToRoom(roomId, 'editor:file:unlocked', {
            fileId,
            unlockedBy: userId,
            timestamp: new Date().toISOString()
        });

        console.log('[Code Editor Socket] File unlocked event emitted');

    } catch (error) {
        console.error('[Code Editor Socket] Failed to emit file unlocked event');
        console.error('[Code Editor Socket] Error:', error.message);
    }
};

const emitValidationResults = (fileId, userId, results) => {
    try {
        console.log('[Code Editor Socket] Emitting validation results');
        console.log('[Code Editor Socket] File ID:', fileId);
        console.log('[Code Editor Socket] Errors:', results.errors?.length || 0);

        const roomId = `editor:${fileId}`;
        emitToRoom(roomId, 'editor:validation:completed', {
            fileId,
            userId,
            results,
            timestamp: new Date().toISOString()
        });

        console.log('[Code Editor Socket] Validation results emitted');

    } catch (error) {
        console.error('[Code Editor Socket] Failed to emit validation results');
        console.error('[Code Editor Socket] Error:', error.message);
    }
};

const emitFileFormatted = (fileId, userId, formattedContent) => {
    try {
        console.log('[Code Editor Socket] Emitting file formatted event');
        console.log('[Code Editor Socket] File ID:', fileId);

        const roomId = `editor:${fileId}`;
        emitToRoom(roomId, 'editor:file:formatted', {
            fileId,
            userId,
            content: formattedContent,
            timestamp: new Date().toISOString()
        });

        console.log('[Code Editor Socket] File formatted event emitted');

    } catch (error) {
        console.error('[Code Editor Socket] Failed to emit file formatted event');
        console.error('[Code Editor Socket] Error:', error.message);
    }
};

module.exports = {
    initializeCodeEditorSocket,
    emitContentUpdate,
    emitFileLocked,
    emitFileUnlocked,
    emitValidationResults,
    emitFileFormatted
};