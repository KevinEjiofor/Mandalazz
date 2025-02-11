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
const guestMiddleware = require("./middlewares/guestMiddleware");
const { initializeWebSocket } = require('./utils/socketHandler');
const { createServer } = require("http");

const app = express();
const server = createServer(app);
initializeWebSocket(server);

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

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
    process.exit(1); // Exit the app if MongoDB URI is missing
}
connectDB();

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/product', productRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/cart', cartRoutes);

// Handle 404 errors
app.use((req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start the server on the correct port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
console.log("🔍 MONGO_URI:", process.env.MONGO_URI);

