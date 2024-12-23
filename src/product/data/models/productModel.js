const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true,
        },
        price: {
            type: mongoose.Schema.Types.Decimal128,
            required: [true, 'Product price is required'],
            validate: {
                validator: (value) => value > 0,
                message: 'Product price must be greater than 0',
            },
        },
        description: {
            type: String,
            trim: true,
            default: null,
        },
        imageUrls: {
            type: [String],
            required: [true, 'Product image URLs are required'],
            trim: true,
        },
        sizes: {
            type: [String],
            required: [true, 'Product size is required'],
            trim: true,
            validate: {
                validator: (value) => value.length > 0,
                message: 'At least one size must be provided',
            },
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            required: [true, 'Admin is required'],
        },
        // adminName: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: 'Admin',
        //     required: [true, 'Admin is required'],
        // }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
