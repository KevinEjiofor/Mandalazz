const mongoose = require('mongoose');
const RoleEnum = require("../../../config/roleEnum");

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        minlength: [2, 'First name must be at least 2 characters long'],
        match: [/^[A-Za-z]+$/, 'First name can only contain alphabets']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        minlength: [2, 'Last name must be at least 2 characters long'],
        match: [/^[A-Za-z]+$/, 'Last name can only contain alphabets']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
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
        default: RoleEnum.USER
    },
    resetPasswordPin: {
        type: String,
        default: null
    },
    resetPasswordExpire: {
        type: Date,
        default: null
    },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
