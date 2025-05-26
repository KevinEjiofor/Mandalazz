require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const connectDB = require('./config/DataBaseConfig');
const MongoStore = require("connect-mongo");

const adminRoutes = require('./routes/adminAuthRoutes');
const userRoutes = require('./routes/userAuthRoutes');
const productRoutes = require('./routes/productRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const cartRoutes = require('./routes/cartRoutes');
const favoritesRoutes = require('./routes/favoriteRoutes');
const commentRoutes = require('./routes/commentRoutes');
const recentViewRoutes = require('./routes/recentViewRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const guestMiddleware = require('./middlewares/guestMiddleware');

const { scheduleEmailVerificationReminders } = require('./utils/scheduledTasks');
const { initializeWebSocket } = require('./utils/socketHandler');
const { createServer } = require('http');

// Create Express app and HTTP server
const app = express();
const server = createServer(app);

// Connect to MongoDB
if (!process.env.MONGO_URI) {
    console.error('❌ ERROR: MONGO_URI is missing!');
    process.exit(1);
}
connectDB();

// Initialize WebSocket
initializeWebSocket(server);

// Run scheduled tasks
scheduleEmailVerificationReminders();

// ✅ CORS setup (before routes and sessions)
const corsOptions = {
    origin: ['https://mandalazz-frontend-vqm8.vercel.app', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
};
app.use(cors(corsOptions));

// Basic Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Middleware (must come before guestMiddleware)
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallbackSecret',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions'
    }),
    cookie: {
        secure: false, // change to true if using HTTPS in production
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
}));

// Guest middleware (requires session)
app.use(guestMiddleware);

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/product', productRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/comment', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/rate', ratingRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/recentview', recentViewRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
