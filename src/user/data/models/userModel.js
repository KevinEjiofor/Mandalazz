const mongoose = require('mongoose');
const RoleEnum = require("../../../config/roleEnum");


const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true},
    email: { type: String, required: true,  unique: true , match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'] },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: Object.values(RoleEnum),
        default: RoleEnum.USER,
    },

    resetPasswordPin: String,
    resetPasswordExpire: Date,

});



const User = mongoose.model('User', userSchema);

module.exports = User;
