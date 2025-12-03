const { getIO, emitToUser, emitToRoom, broadcast } = require('../config/socket.config');
const Project = require('../models/project.model');
const TestScript = require('../models/test.script.model');

const initializeRealtimeUpdatesSocket = (io) => {
    console.log('[Realtime Updates Socket] Initializing realtime updates socket handlers');

    io.on('connection', (socket) => {
        console.log('[Realtime Updates Socket] Client connected to realtime updates');
        console.log('[Realtime Updates Socket] Socket ID:', socket.id);
        console.log('[Realtime Updates Socket] User ID:', socket.userId);

        socket.on('project:subscribe', async (data) => {
            try {
                console.log('[Realtime Updates Socket] Project subscribe request');
                console.log('[Realtime Updates Socket] Project ID:', data.projectId);
                console.log('[Realtime Updates Socket] User ID:', socket.userId);

                const project = await Project.findById(data.projectId);

                if (!project) {
                    console.error('[Realtime Updates Socket] Project not found:', data.projectId);
                    socket.emit('project:error', {
                        message: 'Project not found',
                        projectId: data.projectId
                    });
                    return;
                }

                const hasAccess = await project.hasAccess(socket.userId);
                if (!hasAccess) {
                    console.error('[Realtime Updates Socket] Access denied for user:', socket.userId);
                    socket.emit('project:error', {
                        message: 'Access denied',
                        projectId: data.projectId
                    });
                    return;
                }

                const roomId = `project:${data.projectId}`;
                socket.join(roomId);

                console.log('[Realtime Updates Socket] User subscribed to project');
                console.log('[Realtime Updates Socket] Room ID:', roomId);

                socket.emit('project:subscribed', {
                    projectId: data.projectId,
                    roomId: roomId
                });

            } catch (error) {
                console.error('[Realtime Updates Socket] Project subscribe error:', error.message);
                socket.emit('project:error', {
                    message: 'Failed to subscribe to project',
                    error: error.message
                });
            }
        });

        socket.on('project:unsubscribe', (data) => {
            try {
                console.log('[Realtime Updates Socket] Project unsubscribe request');
                console.log('[Realtime Updates Socket] Project ID:', data.projectId);

                const roomId = `project:${data.projectId}`;
                socket.leave(roomId);

                console.log('[Realtime Updates Socket] User unsubscribed from project');

                socket.emit('project:unsubscribed', {
                    projectId: data.projectId
                });

            } catch (error) {
                console.error('[Realtime Updates Socket] Project unsubscribe error:', error.message);
            }
        });

        socket.on('team:subscribe', async (data) => {
            try {
                console.log('[Realtime Updates Socket] Team subscribe request');
                console.log('[Realtime Updates Socket] Team ID:', data.teamId);
                console.log('[Realtime Updates Socket] User ID:', socket.userId);

                const roomId = `team:${data.teamId}`;
                socket.join(roomId);

                console.log('[Realtime Updates Socket] User subscribed to team');
                console.log('[Realtime Updates Socket] Room ID:', roomId);

                socket.emit('team:subscribed', {
                    teamId: data.teamId,
                    roomId: roomId
                });

            } catch (error) {
                console.error('[Realtime Updates Socket] Team subscribe error:', error.message);
                socket.emit('team:error', {
                    message: 'Failed to subscribe to team',
                    error: error.message
                });
            }
        });

        socket.on('team:unsubscribe', (data) => {
            try {
                console.log('[Realtime Updates Socket] Team unsubscribe request');
                console.log('[Realtime Updates Socket] Team ID:', data.teamId);

                const roomId = `team:${data.teamId}`;
                socket.leave(roomId);

                console.log('[Realtime Updates Socket] User unsubscribed from team');

                socket.emit('team:unsubscribed', {
                    teamId: data.teamId
                });

            } catch (error) {
                console.error('[Realtime Updates Socket] Team unsubscribe error:', error.message);
            }
        });

        socket.on('notification:subscribe', () => {
            try {
                console.log('[Realtime Updates Socket] Notification subscribe request');
                console.log('[Realtime Updates Socket] User ID:', socket.userId);

                const roomId = `notifications:${socket.userId}`;
                socket.join(roomId);

                console.log('[Realtime Updates Socket] User subscribed to notifications');
                console.log('[Realtime Updates Socket] Room ID:', roomId);

                socket.emit('notification:subscribed', {
                    roomId: roomId
                });

            } catch (error) {
                console.error('[Realtime Updates Socket] Notification subscribe error:', error.message);
            }
        });

        socket.on('presence:update', async (data) => {
            try {
                console.log('[Realtime Updates Socket] Presence update received');
                console.log('[Realtime Updates Socket] User ID:', socket.userId);
                console.log('[Realtime Updates Socket] Status:', data.status);

                if (data.projectId) {
                    const roomId = `project:${data.projectId}`;
                    socket.to(roomId).emit('user:presence', {
                        userId: socket.userId,
                        status: data.status,
                        timestamp: new Date().toISOString()
                    });

                    console.log('[Realtime Updates Socket] Presence broadcasted to project room');
                }

            } catch (error) {
                console.error('[Realtime Updates Socket] Presence update error:', error.message);
            }
        });

        socket.on('disconnect', () => {
            console.log('[Realtime Updates Socket] Client disconnected from realtime updates');
            console.log('[Realtime Updates Socket] Socket ID:', socket.id);
            console.log('[Realtime Updates Socket] User ID:', socket.userId);
        });
    });

    console.log('[Realtime Updates Socket] Realtime updates socket handlers initialized successfully');
};

const emitProjectUpdate = (projectId, event, data) => {
    try {
        console.log('[Realtime Updates Socket] Emitting project update');
        console.log('[Realtime Updates Socket] Project ID:', projectId);
        console.log('[Realtime Updates Socket] Event:', event);

        const roomId = `project:${projectId}`;
        emitToRoom(roomId, event, {
            projectId,
            ...data,
            timestamp: new Date().toISOString()
        });

        console.log('[Realtime Updates Socket] Project update emitted successfully');

    } catch (error) {
        console.error('[Realtime Updates Socket] Failed to emit project update');
        console.error('[Realtime Updates Socket] Error:', error.message);
    }
};

const emitTeamUpdate = (teamId, event, data) => {
    try {
        console.log('[Realtime Updates Socket] Emitting team update');
        console.log('[Realtime Updates Socket] Team ID:', teamId);
        console.log('[Realtime Updates Socket] Event:', event);

        const roomId = `team:${teamId}`;
        emitToRoom(roomId, event, {
            teamId,
            ...data,
            timestamp: new Date().toISOString()
        });

        console.log('[Realtime Updates Socket] Team update emitted successfully');

    } catch (error) {
        console.error('[Realtime Updates Socket] Failed to emit team update');
        console.error('[Realtime Updates Socket] Error:', error.message);
    }
};

const emitNotificationToUser = (userId, notification) => {
    try {
        console.log('[Realtime Updates Socket] Emitting notification to user');
        console.log('[Realtime Updates Socket] User ID:', userId);
        console.log('[Realtime Updates Socket] Notification Type:', notification.type);

        const roomId = `notifications:${userId}`;
        emitToRoom(roomId, 'notification:new', {
            ...notification,
            timestamp: new Date().toISOString()
        });

        console.log('[Realtime Updates Socket] Notification emitted successfully');

    } catch (error) {
        console.error('[Realtime Updates Socket] Failed to emit notification');
        console.error('[Realtime Updates Socket] Error:', error.message);
    }
};

const emitTestScriptGenerated = (projectId, testScript) => {
    emitProjectUpdate(projectId, 'test-script:generated', {
        testScriptId: testScript._id,
        name: testScript.name,
        endpoint: testScript.endpoint
    });
};

const emitRepositorySynced = (projectId, repositoryData) => {
    emitProjectUpdate(projectId, 'repository:synced', repositoryData);
};

const emitDatabaseConnected = (projectId, databaseData) => {
    emitProjectUpdate(projectId, 'database:connected', databaseData);
};

const emitTestCompleted = (projectId, executionData) => {
    emitProjectUpdate(projectId, 'test:completed', executionData);
};

const emitReportGenerated = (projectId, reportData) => {
    emitProjectUpdate(projectId, 'report:generated', reportData);
};

const emitMemberAdded = (teamId, memberData) => {
    emitTeamUpdate(teamId, 'member:added', memberData);
};

const emitMemberRemoved = (teamId, memberData) => {
    emitTeamUpdate(teamId, 'member:removed', memberData);
};

const broadcastSystemNotification = (notification) => {
    try {
        console.log('[Realtime Updates Socket] Broadcasting system notification');
        console.log('[Realtime Updates Socket] Notification:', notification.message);

        broadcast('system:notification', {
            ...notification,
            timestamp: new Date().toISOString()
        });

        console.log('[Realtime Updates Socket] System notification broadcasted successfully');

    } catch (error) {
        console.error('[Realtime Updates Socket] Failed to broadcast system notification');
        console.error('[Realtime Updates Socket] Error:', error.message);
    }
};

module.exports = {
    initializeRealtimeUpdatesSocket,
    emitProjectUpdate,
    emitTeamUpdate,
    emitNotificationToUser,
    emitTestScriptGenerated,
    emitRepositorySynced,
    emitDatabaseConnected,
    emitTestCompleted,
    emitReportGenerated,
    emitMemberAdded,
    emitMemberRemoved,
    broadcastSystemNotification
};