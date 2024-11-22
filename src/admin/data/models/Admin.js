const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    // name:{type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true , match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'] },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: true },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
});

module.exports = mongoose.model('Admin', adminSchema);
