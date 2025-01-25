require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const app = express();
const { connectDB } = require('./admin/data/repositories/adminRepository');
const adminRoutes = require('./routes/adminAuthRoutes');
const userRoutes = require('./routes/userAuthRoutes');
const productRoutes = require('./routes/productRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const cartRoutes = require('./routes/cartRoutes');
const guestMiddleware = require("./middlewares/guestMiddleware");
const { initializeWebSocket } = require('./utils/socketHandler');
const {createServer} = require("node:http");

const server = createServer(app);
initializeWebSocket(server);


app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));


app.use(
    session({
        secret: process.env.SESSION_SECRET ,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false },
    })
);
app.use(guestMiddleware);


const mongodbURL = process.env.MONGO_URI;
connectDB();


app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/product', productRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/cart', cartRoutes);

app.use((req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
});


const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
