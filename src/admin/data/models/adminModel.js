const mongoose = require('mongoose');
const RoleEnum = require("../../../config/roleEnum");

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Name must be at least 3 characters long'],
        match: [/^[A-Za-z]+$/, 'Name can only contain alphabets']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        trim: true
    },
    role: {
        type: String,
        enum: Object.values(RoleEnum),
        default: RoleEnum.ADMIN
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpire: {
        type: Date,
        default: null
    },
});

module.exports = mongoose.model('Admin', adminSchema);
