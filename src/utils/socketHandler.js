const { Server } = require('socket.io');

let io;

const initializeWebSocket = (server) => {
    if (!io) {
        io = new Server(server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
        });

        io.on('connection', (socket) => {
            console.log(`✅ User connected: ${socket.id}`);

            socket.on('joinRoom', (room) => {
                console.log(`ℹ️ Socket ${socket.id} joined room: ${room}`);
                socket.join(room);
            });

            socket.on('disconnect', () => {
                console.log(`❌ User disconnected: ${socket.id}`);
            });
        });

        console.log('✅ WebSocket initialized');
    }

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('WebSocket not initialized');
    }
    return io;
};

module.exports = { initializeWebSocket, getIO };
