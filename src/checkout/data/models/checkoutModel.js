const mongoose = require('mongoose');
const CheckoutStatus = require('../../../config/checkoutStatus');

const checkoutSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    products: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
            },
            size: {
                type: String,
                required: true,
                trim: true,
            },
            color: {
                type: String,
                required: true,
                trim: true,
            },
        },
    ],
    totalAmount: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
    },

    deliveryStatus: {
        type: String,
        enum: Object.values(CheckoutStatus),
        default: CheckoutStatus.PENDING,
    },
    userDetails: {
        address: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
            required: true,
        },
    },
    paymentType: {
        type: String,
        enum: ['payment_on_delivery', 'online_payment'],
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending',
    },
    paymentReference: {
        type: String,
        unique: true,
        sparse: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Checkout', checkoutSchema);
