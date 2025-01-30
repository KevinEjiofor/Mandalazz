const io = require('socket.io-client');


const socket = io('http://localhost:5000');

// Join the adminRoom
socket.emit('joinRoom', 'adminRoom');

// Listen for admin notifications
socket.on('adminNotification', (data) => {
    console.log('📢 Admin Notification Received:', data);
});

socket.on('connect', () => {
    console.log('✅ Connected to WebSocket as Admin');
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from WebSocket');
});
