const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    type: String,
    message: String,
    data: mongoose.Schema.Types.Mixed,

    action: {
        type: {
            type: String,
            enum: ['navigate', 'modal', 'external_link'],
            default: 'navigate'
        },
        url: String,
        params: mongoose.Schema.Types.Mixed,
        label: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    read: {
        type: Boolean,
        default: false
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
});

module.exports = mongoose.model('Notification', notificationSchema);