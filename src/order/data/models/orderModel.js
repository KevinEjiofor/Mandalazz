const mongoose = require('mongoose');
const OrderStatus = require("../../../config/orderStatus");

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [false, 'User reference is invalid'],
    },
    products: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: [true, 'Product is required'],
            },
            quantity: {
                type: Number,
                required: [true, 'Quantity is required'],
                min: [1, 'Quantity must be at least 1'],
            },
            size: {
                type: String,
                required: [true, 'Size is required'],
                trim: true,
                validate: {
                    validator: (value) => value.length > 0,
                    message: 'Size cannot be an empty string',
                },
            },
        },
    ],
    totalAmount: {
        type: mongoose.Schema.Types.Decimal128,
        required: [true, 'Total amount is required'],
    },
    status: {
        type: String,
        enum: {
            values: Object.values(OrderStatus),
            message: 'Status must be one of the predefined values',
        },
        default: OrderStatus.PENDING,
    },
    userDetails: {
        address: {
            type: String,
            required: [true, 'Address is required'],
        },
        phoneNumber: {
            type: String,
            required: [true, 'Phone number is required'],
        },
        email: {
            type: String,
            match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
            required: [false, 'Email is invalid'],
        },
    },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
