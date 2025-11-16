const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initializeSocket = (server) => {
    console.log('[Socket] Initializing Socket.IO server');

    io = socketIO(server, {
        cors: {
            origin: process.env.CLIENT_URL || '*',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling'],
        allowEIO3: true,
        maxHttpBufferSize: 1e6,
        connectTimeout: 45000
    });

    console.log('[Socket] Socket.IO server initialized successfully');
    console.log('[Socket] CORS origin:', process.env.CLIENT_URL || '*');
    console.log('[Socket] Transport methods: websocket, polling');

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

            console.log('[Socket Middleware] New connection attempt');
            console.log('[Socket Middleware] Socket ID:', socket.id);
            console.log('[Socket Middleware] Token present:', !!token);

            if (!token) {
                console.error('[Socket Middleware] Authentication failed: No token provided');
                return next(new Error('Authentication token required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id || decoded.userId;
            socket.userEmail = decoded.email;
            socket.userRole = decoded.role;

            console.log('[Socket Middleware] Authentication successful');
            console.log('[Socket Middleware] User ID:', socket.userId);
            console.log('[Socket Middleware] User Email:', socket.userEmail);
            console.log('[Socket Middleware] User Role:', socket.userRole);

            next();
        } catch (error) {
            console.error('[Socket Middleware] Authentication error:', error.message);
            console.error('[Socket Middleware] Socket ID:', socket.id);
            next(new Error('Invalid authentication token'));
        }
    });

    io.on('connection', (socket) => {
        console.log('[Socket] Client connected successfully');
        console.log('[Socket] Socket ID:', socket.id);
        console.log('[Socket] User ID:', socket.userId);
        console.log('[Socket] Total connections:', io.engine.clientsCount);

        socket.join(`user:${socket.userId}`);
        console.log('[Socket] User joined personal room: user:' + socket.userId);

        socket.on('join:room', (roomId) => {
            console.log('[Socket] Join room request');
            console.log('[Socket] Socket ID:', socket.id);
            console.log('[Socket] User ID:', socket.userId);
            console.log('[Socket] Room ID:', roomId);

            socket.join(roomId);
            console.log('[Socket] User joined room successfully:', roomId);

            socket.to(roomId).emit('user:joined', {
                userId: socket.userId,
                socketId: socket.id,
                timestamp: new Date().toISOString()
            });
        });

        socket.on('leave:room', (roomId) => {
            console.log('[Socket] Leave room request');
            console.log('[Socket] Socket ID:', socket.id);
            console.log('[Socket] User ID:', socket.userId);
            console.log('[Socket] Room ID:', roomId);

            socket.leave(roomId);
            console.log('[Socket] User left room successfully:', roomId);

            socket.to(roomId).emit('user:left', {
                userId: socket.userId,
                socketId: socket.id,
                timestamp: new Date().toISOString()
            });
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket] Client disconnected');
            console.log('[Socket] Socket ID:', socket.id);
            console.log('[Socket] User ID:', socket.userId);
            console.log('[Socket] Reason:', reason);
            console.log('[Socket] Remaining connections:', io.engine.clientsCount);
        });

        socket.on('error', (error) => {
            console.error('[Socket] Socket error occurred');
            console.error('[Socket] Socket ID:', socket.id);
            console.error('[Socket] User ID:', socket.userId);
            console.error('[Socket] Error:', error.message);
            console.error('[Socket] Stack:', error.stack);
        });

        socket.on('ping', () => {
            console.log('[Socket] Ping received from client');
            console.log('[Socket] Socket ID:', socket.id);
            socket.emit('pong', { timestamp: new Date().toISOString() });
        });
    });

    io.engine.on('connection_error', (error) => {
        console.error('[Socket Engine] Connection error');
        console.error('[Socket Engine] Error code:', error.code);
        console.error('[Socket Engine] Error message:', error.message);
        console.error('[Socket Engine] Context:', error.context);
    });

    return io;
};

const getIO = () => {
    if (!io) {
        console.error('[Socket] Socket.IO not initialized. Call initializeSocket first');
        throw new Error('Socket.IO not initialized');
    }
    return io;
};

const emitToUser = (userId, event, data) => {
    try {
        console.log('[Socket Emit] Emitting to user');
        console.log('[Socket Emit] User ID:', userId);
        console.log('[Socket Emit] Event:', event);
        console.log('[Socket Emit] Data:', JSON.stringify(data).substring(0, 200));

        const socketIO = getIO();
        socketIO.to(`user:${userId}`).emit(event, data);

        console.log('[Socket Emit] Event emitted successfully');
    } catch (error) {
        console.error('[Socket Emit] Failed to emit to user');
        console.error('[Socket Emit] User ID:', userId);
        console.error('[Socket Emit] Event:', event);
        console.error('[Socket Emit] Error:', error.message);
    }
};

const emitToRoom = (roomId, event, data) => {
    try {
        console.log('[Socket Emit] Emitting to room');
        console.log('[Socket Emit] Room ID:', roomId);
        console.log('[Socket Emit] Event:', event);
        console.log('[Socket Emit] Data:', JSON.stringify(data).substring(0, 200));

        const socketIO = getIO();
        socketIO.to(roomId).emit(event, data);

        console.log('[Socket Emit] Event emitted successfully');
    } catch (error) {
        console.error('[Socket Emit] Failed to emit to room');
        console.error('[Socket Emit] Room ID:', roomId);
        console.error('[Socket Emit] Event:', event);
        console.error('[Socket Emit] Error:', error.message);
    }
};

const broadcast = (event, data) => {
    try {
        console.log('[Socket Broadcast] Broadcasting to all clients');
        console.log('[Socket Broadcast] Event:', event);
        console.log('[Socket Broadcast] Data:', JSON.stringify(data).substring(0, 200));

        const socketIO = getIO();
        socketIO.emit(event, data);

        console.log('[Socket Broadcast] Event broadcasted successfully');
        console.log('[Socket Broadcast] Total clients:', socketIO.engine.clientsCount);
    } catch (error) {
        console.error('[Socket Broadcast] Failed to broadcast');
        console.error('[Socket Broadcast] Event:', event);
        console.error('[Socket Broadcast] Error:', error.message);
    }
};

const getUserSockets = async (userId) => {
    try {
        console.log('[Socket Query] Getting sockets for user');
        console.log('[Socket Query] User ID:', userId);

        const socketIO = getIO();
        const sockets = await socketIO.in(`user:${userId}`).fetchSockets();

        console.log('[Socket Query] Found sockets:', sockets.length);
        return sockets;
    } catch (error) {
        console.error('[Socket Query] Failed to get user sockets');
        console.error('[Socket Query] User ID:', userId);
        console.error('[Socket Query] Error:', error.message);
        return [];
    }
};

const getRoomSockets = async (roomId) => {
    try {
        console.log('[Socket Query] Getting sockets for room');
        console.log('[Socket Query] Room ID:', roomId);

        const socketIO = getIO();
        const sockets = await socketIO.in(roomId).fetchSockets();

        console.log('[Socket Query] Found sockets:', sockets.length);
        return sockets;
    } catch (error) {
        console.error('[Socket Query] Failed to get room sockets');
        console.error('[Socket Query] Room ID:', roomId);
        console.error('[Socket Query] Error:', error.message);
        return [];
    }
};

const disconnectUser = async (userId) => {
    try {
        console.log('[Socket Disconnect] Disconnecting user');
        console.log('[Socket Disconnect] User ID:', userId);

        const sockets = await getUserSockets(userId);

        for (const socket of sockets) {
            console.log('[Socket Disconnect] Disconnecting socket:', socket.id);
            socket.disconnect(true);
        }

        console.log('[Socket Disconnect] User disconnected successfully');
        console.log('[Socket Disconnect] Sockets disconnected:', sockets.length);
    } catch (error) {
        console.error('[Socket Disconnect] Failed to disconnect user');
        console.error('[Socket Disconnect] User ID:', userId);
        console.error('[Socket Disconnect] Error:', error.message);
    }
};

const getConnectionStats = () => {
    try {
        const socketIO = getIO();
        const stats = {
            totalConnections: socketIO.engine.clientsCount,
            timestamp: new Date().toISOString()
        };

        console.log('[Socket Stats] Connection statistics');
        console.log('[Socket Stats] Total connections:', stats.totalConnections);
        console.log('[Socket Stats] Timestamp:', stats.timestamp);

        return stats;
    } catch (error) {
        console.error('[Socket Stats] Failed to get connection stats');
        console.error('[Socket Stats] Error:', error.message);
        return null;
    }
};

module.exports = {
    initializeSocket,
    getIO,
    emitToUser,
    emitToRoom,
    broadcast,
    getUserSockets,
    getRoomSockets,
    disconnectUser,
    getConnectionStats
};