const io = require('socket.io-client');

// Connect to the WebSocket server
const socket = io('http://localhost:3000');

// Join the adminRoom
socket.emit('joinRoom', 'adminRoom');

// Listen for admin notifications
socket.on('adminNotification', (data) => {
    console.log('📢 Admin Notification Received:', data);
    // Log or handle the received notification as needed
});

socket.on('connect', () => {
    console.log('✅ Connected to WebSocket as Admin');
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from WebSocket');
});
