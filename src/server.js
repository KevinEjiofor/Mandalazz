require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const  connectDB = require('./config/DataBaseConfig');
const adminRoutes = require('./routes/adminAuthRoutes');
const userRoutes = require('./routes/userAuthRoutes');
const productRoutes = require('./routes/productRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const cartRoutes = require('./routes/cartRoutes');
const favoritesRoutes = require('./routes/favoriteRoutes');
const comment = require('./routes/commentRoutes')
const ratingRoutes = require('./routes/ratingRoutes');
const guestMiddleware = require("./middlewares/guestMiddleware");
const notificationRoutes = require('./routes/notificationRoutes');
const { scheduleEmailVerificationReminders } = require('./utils/scheduledTasks')
const { initializeWebSocket } = require('./utils/socketHandler');
const { createServer } = require("http");

const app = express();
const server = createServer(app);
initializeWebSocket(server);

// Enhanced CORS configuration for production
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            process.env.CLIENT_URL,
            'http://localhost:3000',
            'http://localhost:3030',
            'http://localhost:5173',
            'http://localhost:5174'
        ].filter(Boolean);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
};

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors(corsOptions));

// Enhanced session configuration for production
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    },
    name: 'mandelazz.sid' // Custom session name
}));

app.use(guestMiddleware);

// Health check endpoint for Azure
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Mandelazz API is running!',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Connect to MongoDB with enhanced error handling
if (!process.env.MONGO_URI) {
    console.error("❌ ERROR: MONGO_URI is missing!");
    process.exit(1);
}

// Initialize scheduled tasks
scheduleEmailVerificationReminders();

// Connect to database
connectDB().catch(err => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
});

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/product', productRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/comment', comment);
app.use('/api/notifications', notificationRoutes);
app.use('/api/rate', ratingRoutes);
app.use('/api/favorites', favoritesRoutes);

// Enhanced error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);

    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS policy violation' });
    }

    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        method: req.method
    });
});

// Server configuration
const PORT = process.env.PORT || 3030;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

// Start server
server.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on ${HOST}:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Socket.IO server running on port ${PORT}`);
    console.log(`🗄️  Database: ${process.env.MONGO_URI ? 'Connected' : 'Not configured'}`);

    if (process.env.NODE_ENV === 'production') {
        console.log(`🌐 Health check available at: http://${HOST}:${PORT}/health`);
    }
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    server.close((err) => {
        if (err) {
            console.error('❌ Error during server shutdown:', err);
            process.exit(1);
        }

        console.log('✅ Server closed successfully');

        // Close database connections if needed
        // mongoose.connection.close(() => {
        //     console.log('✅ Database connection closed');
        //     process.exit(0);
        // });

        process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
};

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = { app, server };