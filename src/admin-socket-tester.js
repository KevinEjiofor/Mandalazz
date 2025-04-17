const io = require('socket.io-client');

const socket = io(`http://localhost:3030`);

socket.on('connect', () => {
    console.log('✅ Connected to WebSocket server as admin');
    socket.emit('joinRoom', 'adminRoom');
    console.log('📡 Joined adminRoom. Listening for notifications...\n');
});

socket.on('adminNotification', (data) => {
    console.log('🔔 Admin Notification Received:', data);
    console.log('-------------------------------------------');
    console.log('Type:', data.type);
    console.log('Message:', data.message);
    console.log('Data:', JSON.stringify(data.data, null, 2));
    console.log('-------------------------------------------\n');
});

socket.on('connect_error', (error) => {
    console.error('⚠️ Connection error:', error.message || error);
});

socket.on('disconnect', () => {
    console.log('🔌 Disconnected from WebSocket server');
});

console.log('🚀 Starting admin notification listener...');
