require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const MongoStore = require("connect-mongo");
const { createServer } = require('http');

// DB Connection
const connectDB = require('./config/DataBaseConfig');

// Middlewares & Utils
const guestMiddleware = require('./middlewares/guestMiddleware');
const { scheduleEmailVerificationReminders } = require('./utils/scheduledTasks');
const { initializeWebSocket } = require('./utils/socketHandler');

// Route Files
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
const locationRoutes = require('./routes/locationRoutes');
const addressRoutes = require('./routes/addressRoutes.');
const  analyticsRoutes = require('./routes/analyticsRoutes');

// Create Express app and HTTP server
const app = express();
const server = createServer(app);

// Ensure DB URI exists
if (!process.env.MONGO_URI) {
    console.error('❌ ERROR: MONGO_URI is missing!');
    process.exit(1);
}

// Connect to MongoDB
connectDB();


initializeWebSocket(server);
scheduleEmailVerificationReminders();


const allowedOrigins = process.env.CLIENT_URL?.split(',') || [];
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS error: Origin ${origin} not allowed`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
};
app.use(cors(corsOptions));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(session({
    name: process.env.SESSION_NAME || 'sid',
    secret: process.env.SESSION_SECRET || 'fallbackSecret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
}));


app.use(guestMiddleware);


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
app.use('/api/address', addressRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/analytics', analyticsRoutes);


app.get('/', (req, res) => {
    res.send('🚀 Mandelazz API is running');
});


app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 ENV: ${process.env.NODE_ENV}`);
    console.log(`🔗 Allowed Origins: ${allowedOrigins.join(', ')}`);
});
