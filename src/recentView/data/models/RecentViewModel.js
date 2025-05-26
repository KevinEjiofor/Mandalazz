const mongoose = require('mongoose');

const recentViewSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        guestId: {
            type: String,
            default: null,
            expiresAt: {
                type: Date,
                default: () => Date.now() + 96 * 60 * 60 * 1000,
            },
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        viewedAt: {
            type: Date,
            default: Date.now,
            expires: 2592000,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('RecentView', recentViewSchema);
