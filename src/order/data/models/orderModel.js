const mongoose = require('mongoose');
const OrderStatus = require("../../../config/orderStatus");

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
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
        },
    ],
    totalAmount: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(OrderStatus),
        default: OrderStatus.PENDING,
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
            required: false,
        },
    },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
