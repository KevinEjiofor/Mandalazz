const Admin = require('../models/adminModel');
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const dburl = process.env.MONGO_URI;

        await mongoose.connect(dburl);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('Error connecting to MongoDB', error);
        process.exit(1);
    }
};

const findAdminByName = async (name) => {
    return Admin.findOne({name});
};

const findAdminByEmail = async (email) => {
    return Admin.findOne({email});
};

const createAdmin = async (name, email, password) => {
    const newAdmin = new Admin({ name, email, password });
    await newAdmin.save();
    return newAdmin;
};

module.exports = { findAdminByEmail, createAdmin, findAdminByName, connectDB };