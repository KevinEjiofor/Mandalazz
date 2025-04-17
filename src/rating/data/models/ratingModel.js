const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    userName: {
        type: String,
    },
    userEmail: {
        type: String,
    },
    rating: {
        type: Number,
        required: true,
    },
    comment: {
        type: String,
        default: '',
    },
}, { timestamps: true });

module.exports = mongoose.model('Rating', ratingSchema);
