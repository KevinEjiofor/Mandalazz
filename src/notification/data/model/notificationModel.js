const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    type: String,
    message: String,
    data: mongoose.Schema.Types.Mixed,
    createdAt: {
        type: Date,
        default: Date.now
    },
    read: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Notification', notificationSchema);
