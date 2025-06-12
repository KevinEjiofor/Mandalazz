const io = require('socket.io-client');
const axios = require('axios'); // For testing API endpoints

// Use the correct port from your environment
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3030';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3030/api';

console.log(`🚀 Starting admin notification listener on ${SOCKET_URL}...`);
console.log(`🌐 API Base URL: ${API_BASE_URL}`);

const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 5000
});

// Store received notifications for testing
const receivedNotifications = [];

socket.on('connect', () => {
    console.log('✅ Connected to WebSocket server as admin');
    console.log('📡 Socket ID:', socket.id);

    // Join the admin room
    socket.emit('joinRoom', 'adminRoom');
    console.log('🏠 Joined adminRoom. Listening for notifications...\n');
});

socket.on('adminNotification', (data) => {
    console.log('🔔 Admin Notification Received:');
    console.log('==========================================');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('📋 Type:', data.type);
    console.log('💬 Message:', data.message);

    // Enhanced URL logging and testing
    if (data.url) {
        console.log('🔗 Action URL:', data.url);
        console.log('🔗 URL Type:', typeof data.url);
        console.log('🔗 URL Length:', data.url.length);

        // Test if URL is accessible
        testActionUrl(data.url);
    }

    if (data.action) {
        console.log('⚡ Action Object:', JSON.stringify(data.action, null, 2));
    }

    if (data.data) {
        console.log('📊 Additional Data:', JSON.stringify(data.data, null, 2));
    }

    // Store notification for later testing
    receivedNotifications.push({
        ...data,
        receivedAt: new Date().toISOString()
    });

    console.log('📝 Total notifications received:', receivedNotifications.length);
    console.log('==========================================\n');
});

// Function to test action URLs
async function testActionUrl(url) {
    try {
        console.log('🧪 Testing action URL accessibility...');

        // Basic URL validation
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        const isValidUrl = urlPattern.test(url) || url.startsWith('http://localhost') || url.startsWith('https://localhost');

        if (!isValidUrl) {
            console.log('⚠️  URL format appears invalid:', url);
            return;
        }

        // Try to make a HEAD request to check if URL is accessible
        const response = await axios.head(url, { timeout: 5000 });
        console.log('✅ Action URL is accessible - Status:', response.status);

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('🔴 Action URL not accessible - Connection refused');
        } else if (error.code === 'TIMEOUT') {
            console.log('🔴 Action URL not accessible - Timeout');
        } else {
            console.log('🔴 Action URL test failed:', error.message);
        }
    }
}

// Connection event handlers
socket.on('connect_error', (error) => {
    console.error('⚠️ Connection error:', error.message || error);
    console.error('🔧 Make sure your server is running on the correct port');
});

socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected from WebSocket server');
    console.log('📝 Reason:', reason);
});

socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
});

socket.on('reconnect_error', (error) => {
    console.error('🔄 Reconnection failed:', error.message);
});

socket.on('reconnect_failed', () => {
    console.error('❌ All reconnection attempts failed');
});

// Interactive testing commands
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n📋 Available Commands:');
console.log('  - type "status" to check connection status');
console.log('  - type "count" to see total notifications received');
console.log('  - type "last" to see the last notification');
console.log('  - type "test [url]" to test a specific URL');
console.log('  - type "clear" to clear received notifications');
console.log('  - type "exit" to quit\n');

rl.on('line', async (input) => {
    const command = input.trim().toLowerCase();

    if (command === 'status') {
        console.log('📊 Connection Status:', socket.connected ? '✅ Connected' : '🔴 Disconnected');
        console.log('📡 Socket ID:', socket.id);
    } else if (command === 'count') {
        console.log('📈 Total notifications received:', receivedNotifications.length);
    } else if (command === 'last') {
        if (receivedNotifications.length > 0) {
            const last = receivedNotifications[receivedNotifications.length - 1];
            console.log('📋 Last notification:');
            console.log(JSON.stringify(last, null, 2));
        } else {
            console.log('📭 No notifications received yet');
        }
    } else if (command.startsWith('test ')) {
        const url = command.substring(5);
        await testActionUrl(url);
    } else if (command === 'clear') {
        receivedNotifications.length = 0;
        console.log('🧹 Cleared all received notifications');
    } else if (command === 'exit') {
        console.log('👋 Shutting down admin socket tester...');
        socket.disconnect();
        rl.close();
        process.exit(0);
    } else {
        console.log('❓ Unknown command. Available: status, count, last, test [url], clear, exit');
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down admin socket tester...');
    socket.disconnect();
    rl.close();
    process.exit(0);
});

// Enhanced connection monitoring
setInterval(() => {
    if (socket.connected) {
        console.log('💓 Connection is alive - Notifications received:', receivedNotifications.length);
    } else {
        console.log('💔 Connection is down, attempting to reconnect...');
        socket.connect();
    }
}, 30000); // Check every 30 seconds

// Log startup completion
setTimeout(() => {
    console.log('🎯 Admin socket tester is ready for notifications!');
    console.log('💡 You can now send notifications from Postman to test URL actions\n');
}, 1000);