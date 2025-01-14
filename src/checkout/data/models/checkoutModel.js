const mongoose = require('mongoose');
const CheckoutStatus = require("../../../config/orderStatus");

const checkoutSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
        },
    ],
    totalAmount: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
    },
    status: {
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
        },
        serialCode: {
            type: String,
            unique: true,
            required: true,
        },
        paymentType: {
            type: String,
            enum: ['payment_on_delivery', 'online_payment'],
            required: true,
        },
    },
}, { timestamps: true });

module.exports = mongoose.model('Checkout', checkoutSchema);
