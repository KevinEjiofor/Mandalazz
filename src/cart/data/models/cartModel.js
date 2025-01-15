const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
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
    items: [
        {
            product: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
            },
            color: {
                type: String,
                default: null,
            },
            size: {
                type: String,
                default: null,
            },
        },
    ],
    totalAmount: {
        type: mongoose.Schema.Types.Decimal128,
        default: 0,
    },
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);
