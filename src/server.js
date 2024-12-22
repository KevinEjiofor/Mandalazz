require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();
const { connectDB } = require('./admin/data/repositories/adminRepository');
const adminRoutes = require('./routes/adminAuthRoutes');
const userRoutes = require('./routes/userAuthRoutes');
const productRoutes = require('./routes/productRoutes')
const orderRoutes = require('./routes/orderRoutes')
const cartRoutes = require('./routes/cartRoutes')


app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

const mongodbURL = process.env.MONGO_URI;
connectDB();

app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/product', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);


app.use((req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT ;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
