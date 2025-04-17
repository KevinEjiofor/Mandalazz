let io;

function initializeWebSocket(server) {
    const { Server } = require('socket.io');
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log('🟢 A client connected:', socket.id);

        socket.on('joinRoom', (room) => {
            socket.join(room);
            console.log(`🔗 Socket ${socket.id} joined room: ${room}`);
        });

        socket.on('disconnect', () => {
            console.log('🔴 Client disconnected:', socket.id);
        });
    });
}

function getIO() {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
}

module.exports = { initializeWebSocket, getIO };
