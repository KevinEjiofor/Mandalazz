const mongoose = require('mongoose');

const variationSchema = new mongoose.Schema({
    color: { type: String, required: true, trim: true },
    sizes: [{
        size: { type: String, required: true },
        stock: { type: Number, required: true, min: 0 }
    }],
    images: {
        type: [String],
        required: true,
        validate: {
            validator: imgs => imgs.length > 0,
            message: 'At least one image per variation is required'
        }
    }
});

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    price: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        min: [0.01, 'Price must be > 0']
    },
    discountPrice: {
        type: mongoose.Schema.Types.Decimal128,
        validate: {
            validator(v) { return v == null || v >= 0 && v < this.price; },
            message: 'Discount must be >= 0 and less than original price'
        }
    },
    description: { type: String, trim: true, default: null },
    variations: {
        type: [variationSchema],
        required: true,
        validate: { validator(arr) { return arr.length > 0; }, message: 'At least one variation required' }
    },
    category: {
        type: String,
        required: true,
        enum: ['woman','man','unisex','skincare','electronics','accessories','home','general']
    },
    tags: { type: [String], default: [] },
    isActive: {
        type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    adminName: { type: String, required: true },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    brand: { type: String, trim: true, default: null },
    brandType: {
        type: String,
        required: true,
        enum: ['foreign', 'local']
    },
    dateAdded: { type: Date, default: Date.now }
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text', tags: 'text', brand: 'text' });

module.exports = mongoose.model('Product', productSchema);
