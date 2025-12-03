const { getIO, emitToUser, emitToRoom } = require('../config/socket.config');
const TestExecution = require('../models/test.execution.model');
const Project = require('../models/project.model');

const initializeTestExecutionSocket = (io) => {
    console.log('[Test Execution Socket] Initializing test execution socket handlers');

    io.on('connection', (socket) => {
        console.log('[Test Execution Socket] Client connected to test execution');
        console.log('[Test Execution Socket] Socket ID:', socket.id);
        console.log('[Test Execution Socket] User ID:', socket.userId);

        socket.on('execution:subscribe', async (data) => {
            try {
                console.log('[Test Execution Socket] Subscribe request received');
                console.log('[Test Execution Socket] Execution ID:', data.executionId);
                console.log('[Test Execution Socket] User ID:', socket.userId);

                const execution = await TestExecution.findById(data.executionId).populate('project');

                if (!execution) {
                    console.error('[Test Execution Socket] Execution not found:', data.executionId);
                    socket.emit('execution:error', {
                        message: 'Execution not found',
                        executionId: data.executionId
                    });
                    return;
                }

                const hasAccess = await execution.project.hasAccess(socket.userId);
                if (!hasAccess) {
                    console.error('[Test Execution Socket] Access denied for user:', socket.userId);
                    socket.emit('execution:error', {
                        message: 'Access denied',
                        executionId: data.executionId
                    });
                    return;
                }

                const roomId = `execution:${data.executionId}`;
                socket.join(roomId);

                console.log('[Test Execution Socket] User subscribed to execution');
                console.log('[Test Execution Socket] Room ID:', roomId);

                socket.emit('execution:subscribed', {
                    executionId: data.executionId,
                    roomId: roomId,
                    execution: execution
                });

            } catch (error) {
                console.error('[Test Execution Socket] Subscribe error:', error.message);
                socket.emit('execution:error', {
                    message: 'Failed to subscribe to execution',
                    error: error.message
                });
            }
        });

        socket.on('execution:unsubscribe', (data) => {
            try {
                console.log('[Test Execution Socket] Unsubscribe request received');
                console.log('[Test Execution Socket] Execution ID:', data.executionId);

                const roomId = `execution:${data.executionId}`;
                socket.leave(roomId);

                console.log('[Test Execution Socket] User unsubscribed from execution');
                console.log('[Test Execution Socket] Room ID:', roomId);

                socket.emit('execution:unsubscribed', {
                    executionId: data.executionId
                });

            } catch (error) {
                console.error('[Test Execution Socket] Unsubscribe error:', error.message);
            }
        });

        socket.on('execution:start', async (data) => {
            try {
                console.log('[Test Execution Socket] Execution start event received');
                console.log('[Test Execution Socket] Execution ID:', data.executionId);
                console.log('[Test Execution Socket] User ID:', socket.userId);

                const roomId = `execution:${data.executionId}`;

                io.to(roomId).emit('execution:started', {
                    executionId: data.executionId,
                    status: 'running',
                    startedAt: new Date().toISOString(),
                    startedBy: socket.userId
                });

                console.log('[Test Execution Socket] Execution started event emitted');

            } catch (error) {
                console.error('[Test Execution Socket] Start event error:', error.message);
            }
        });

        socket.on('execution:progress', async (data) => {
            try {
                console.log('[Test Execution Socket] Progress update received');
                console.log('[Test Execution Socket] Execution ID:', data.executionId);
                console.log('[Test Execution Socket] Progress:', data.progress);

                const roomId = `execution:${data.executionId}`;

                io.to(roomId).emit('execution:progress:update', {
                    executionId: data.executionId,
                    progress: data.progress,
                    current: data.current,
                    total: data.total,
                    currentTest: data.currentTest,
                    timestamp: new Date().toISOString()
                });

                console.log('[Test Execution Socket] Progress update emitted');

            } catch (error) {
                console.error('[Test Execution Socket] Progress update error:', error.message);
            }
        });

        socket.on('execution:test:result', async (data) => {
            try {
                console.log('[Test Execution Socket] Test result received');
                console.log('[Test Execution Socket] Execution ID:', data.executionId);
                console.log('[Test Execution Socket] Test Case:', data.testCase);
                console.log('[Test Execution Socket] Status:', data.status);

                const roomId = `execution:${data.executionId}`;

                io.to(roomId).emit('execution:test:completed', {
                    executionId: data.executionId,
                    testCase: data.testCase,
                    status: data.status,
                    duration: data.duration,
                    result: data.result,
                    timestamp: new Date().toISOString()
                });

                console.log('[Test Execution Socket] Test result emitted');

            } catch (error) {
                console.error('[Test Execution Socket] Test result error:', error.message);
            }
        });

        socket.on('execution:log', async (data) => {
            try {
                console.log('[Test Execution Socket] Log entry received');
                console.log('[Test Execution Socket] Execution ID:', data.executionId);
                console.log('[Test Execution Socket] Log Level:', data.level);

                const roomId = `execution:${data.executionId}`;

                io.to(roomId).emit('execution:log:entry', {
                    executionId: data.executionId,
                    level: data.level,
                    message: data.message,
                    source: data.source,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('[Test Execution Socket] Log entry error:', error.message);
            }
        });

        socket.on('execution:complete', async (data) => {
            try {
                console.log('[Test Execution Socket] Execution complete event received');
                console.log('[Test Execution Socket] Execution ID:', data.executionId);
                console.log('[Test Execution Socket] Final Status:', data.status);

                const roomId = `execution:${data.executionId}`;

                io.to(roomId).emit('execution:completed', {
                    executionId: data.executionId,
                    status: data.status,
                    results: data.results,
                    duration: data.duration,
                    completedAt: new Date().toISOString()
                });

                console.log('[Test Execution Socket] Execution completed event emitted');

            } catch (error) {
                console.error('[Test Execution Socket] Complete event error:', error.message);
            }
        });

        socket.on('execution:cancel', async (data) => {
            try {
                console.log('[Test Execution Socket] Cancel request received');
                console.log('[Test Execution Socket] Execution ID:', data.executionId);
                console.log('[Test Execution Socket] User ID:', socket.userId);

                const roomId = `execution:${data.executionId}`;

                io.to(roomId).emit('execution:cancelled', {
                    executionId: data.executionId,
                    cancelledBy: socket.userId,
                    reason: data.reason,
                    timestamp: new Date().toISOString()
                });

                console.log('[Test Execution Socket] Execution cancelled event emitted');

            } catch (error) {
                console.error('[Test Execution Socket] Cancel event error:', error.message);
            }
        });

        socket.on('execution:error', async (data) => {
            try {
                console.log('[Test Execution Socket] Execution error received');
                console.log('[Test Execution Socket] Execution ID:', data.executionId);
                console.log('[Test Execution Socket] Error:', data.error);

                const roomId = `execution:${data.executionId}`;

                io.to(roomId).emit('execution:error:occurred', {
                    executionId: data.executionId,
                    error: data.error,
                    severity: data.severity,
                    timestamp: new Date().toISOString()
                });

                console.log('[Test Execution Socket] Execution error event emitted');

            } catch (error) {
                console.error('[Test Execution Socket] Error event error:', error.message);
            }
        });

        socket.on('disconnect', () => {
            console.log('[Test Execution Socket] Client disconnected from test execution');
            console.log('[Test Execution Socket] Socket ID:', socket.id);
            console.log('[Test Execution Socket] User ID:', socket.userId);
        });
    });

    console.log('[Test Execution Socket] Test execution socket handlers initialized successfully');
};

const emitExecutionUpdate = (executionId, event, data) => {
    try {
        console.log('[Test Execution Socket] Emitting execution update');
        console.log('[Test Execution Socket] Execution ID:', executionId);
        console.log('[Test Execution Socket] Event:', event);

        const roomId = `execution:${executionId}`;
        emitToRoom(roomId, event, {
            executionId,
            ...data,
            timestamp: new Date().toISOString()
        });

        console.log('[Test Execution Socket] Execution update emitted successfully');

    } catch (error) {
        console.error('[Test Execution Socket] Failed to emit execution update');
        console.error('[Test Execution Socket] Error:', error.message);
    }
};

const emitExecutionStart = (executionId, data) => {
    emitExecutionUpdate(executionId, 'execution:started', data);
};

const emitExecutionProgress = (executionId, progress, current, total) => {
    emitExecutionUpdate(executionId, 'execution:progress:update', {
        progress,
        current,
        total
    });
};

const emitTestResult = (executionId, testResult) => {
    emitExecutionUpdate(executionId, 'execution:test:completed', testResult);
};

const emitExecutionComplete = (executionId, results) => {
    emitExecutionUpdate(executionId, 'execution:completed', results);
};

const emitExecutionError = (executionId, error) => {
    emitExecutionUpdate(executionId, 'execution:error:occurred', { error });
};

module.exports = {
    initializeTestExecutionSocket,
    emitExecutionUpdate,
    emitExecutionStart,
    emitExecutionProgress,
    emitTestResult,
    emitExecutionComplete,
    emitExecutionError
};