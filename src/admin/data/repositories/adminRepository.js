const Admin = require('../models/Admin');

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const dburl= process.env.MONGO_URI

        await mongoose.connect(dburl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected');
    } catch (error) {
        console.error('Error connecting to MongoDB', error);
        process.exit(1);
    }
};

const findAdminByEmail = async (email) => {
    return Admin.findOne({email});
};


const createAdmin = async (email, password) => {
    const newAdmin = new Admin({ email, password });
    await newAdmin.save();
    return newAdmin;
};

module.exports = { findAdminByEmail, createAdmin,  connectDB };
