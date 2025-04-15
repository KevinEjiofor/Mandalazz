require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { createServer } = require("http");
const { initializeWebSocket, getIO } = require('./utils/socketHandler');
const { connectDB } = require('./admin/data/repositories/adminRepository');

const adminRoutes = require('./routes/adminAuthRoutes');
const userRoutes = require('./routes/userAuthRoutes');
const productRoutes = require('./routes/productRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const cartRoutes = require('./routes/cartRoutes');
const commentRoutes = require('./routes/commentRoutes');
const guestMiddleware = require("./middlewares/guestMiddleware");

const app = express();
const server = createServer(app); // shared server for express + socket.io

// Initialize WebSocket using the same server
initializeWebSocket(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
}));

app.use(guestMiddleware);

// Connect Mongo
if (!process.env.MONGO_URI) {
    console.error("❌ ERROR: MONGO_URI is missing!");
    process.exit(1);
}
connectDB();

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/product', productRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/comment', commentRoutes);

// 404 fallback
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// WebSocket Message Emission Example
const sendAdminNotification = () => {
    setInterval(() => {
        try {
            console.log("⚡ Emitting adminNotification to adminRoom...");
            // const io = getIO(); // Get the initialized WebSocket instance
            // io.to('adminRoom').emit('adminNotification', {
            //     message: 'This is a test notification from server!',
            //     timestamp: new Date().toISOString(),
            // });
        } catch (error) {
            console.error('❌ Error emitting message:', error);
        }
    }, 5000); // Send every 5 seconds for testing purposes
};

// Start server and emit message
const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
    console.log(`🚀 Server + WebSocket running on port ${PORT}`);
    // Start emitting the test notification to the 'adminRoom'
    sendAdminNotification();
});
