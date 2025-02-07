const mongoose = require('mongoose');

const variationSchema = new mongoose.Schema({
    color: {
        type: String,
        required: [true, 'Color is required'],
        trim: true,
    },
    sizes: [
        {
            size: {
                type: String,
                required: [true, 'Size is required'],
            },
            stock: {
                type: Number,
                required: [true, 'Stock is required'],
                min: [0, 'Stock cannot be negative'],
            },
        },
    ],
    images: {
        type: [String],
        required: [true, 'At least one image is required for each variation'],
        validate: {
            validator: (images) => images.length > 0,
            message: 'Each variation must have at least one image',
        },
    },
});

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
        discountPrice: {
            type: mongoose.Schema.Types.Decimal128,
            validate: {
                validator: function (value) {
                    return value == null || value < this.price;
                },
                message: 'Discount price must be less than the original price',
            },
        },
        description: {
            type: String,
            trim: true,
            default: null,
        },
        variations: {
            type: [variationSchema],
            required: [true, 'At least one variation is required'],
            validate: {
                validator: (variations) => variations.length > 0,
                message: 'Product must have at least one variation',
            },
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            enum: {
                values: ['woman', 'man', 'unisex', 'skincare', 'electronics'],
                message: 'Invalid category',
            },
        },

        tags: {
            type: [String],
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            required: [true, 'Admin ID is required'],
        },
        adminName: {
            type: String,
            ref: 'Admin',
            required: [true, 'Admin name is required'],
        },
    },
    { timestamps: true }
);


productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
