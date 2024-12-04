const mongoose = require('mongoose');
const RoleEnum = require("../../../config/roleEnum");

const adminSchema = new mongoose.Schema({
    name:{type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true , match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'] },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: Object.values(RoleEnum),
        default: RoleEnum.USER,
    },
    isAdmin: { type: Boolean, default: true },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
});

module.exports = mongoose.model('Admin', adminSchema);
