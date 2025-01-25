const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['checkoutSuccess', 'paymentFailure'], // Example types
    },
    message: {
        type: String,
        required: true,
    },
    data: mongoose.Schema.Types.Mixed, 
    isRead: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Notification', notificationSchema);
