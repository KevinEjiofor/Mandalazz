require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();
const { connectDB } = require('./admin/data/repositories/adminRepository'); // Correct import
const adminRoutes = require('./routes/adminAuthRoutes');

app.use(express.json());
app.use(cors());

const mongodbURL = process.env.MONGO_URI;
connectDB();

app.use('/api/admin', adminRoutes);

app.use((req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3030;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
