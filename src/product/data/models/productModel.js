const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    price: {
        type: mongoose.Schema.Types.Decimal128,
        required: [true, 'Product price is required'],
        validate: {
            validator: (value) => value > 0,
            message: 'Product price must be greater than 0'
        }
    },
    description: {
        type: String,
        trim: true,
        default: null
    },
    imageUrl: {
        type: String,
        required: [true, 'Product image URL is required'],
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: [true, 'Admin is required']
    }
});

module.exports = mongoose.model('Product', productSchema);
