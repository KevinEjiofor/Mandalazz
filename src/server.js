require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { connectDB } = require('./admin/data/repositories/adminRepository');
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

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

scheduleEmailVerificationReminders();

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
}));

app.use(guestMiddleware);

// Connect to MongoDB
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
app.use('/api/comment', comment);
app.use('/api/notifications', notificationRoutes);
app.use('/api/rate', ratingRoutes);
app.use('/api/favorites', favoritesRoutes);


app.use((req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
});


const PORT = process.env.PORT;
server.listen(PORT, () => {
    // console.log(`🚀 Server running on port ${PORT}`);
});
// console.log("🔍 MONGO_URI:", process.env.MONGO_URI);

