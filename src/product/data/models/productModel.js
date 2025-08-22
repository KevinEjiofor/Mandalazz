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
        discountPercent: {
            type: Number, // Change from Decimal128 to Number
            min: 0,
            max: 100,
            default: 0,
            validate: {
                validator(v) {
                    if (!v) return true;
                    return v >= 0 && v <= 100;
                },
                message: 'Discount must be between 0 and 100 percent'
            }
        },
    finalPrice: {
        type: mongoose.Schema.Types.Decimal128,
        required: true
    },
    bulkDiscountPercent: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    bulkDiscountStartDate: {
        type: Date,
        default: null
    },
    bulkDiscountEndDate: {
        type: Date,
        default: null
    },
    description: { type: String, trim: true, default: null },
    variations: {
        type: [variationSchema],
        required: true,
        validate: {
            validator(arr) { return arr.length > 0; },
            message: 'At least one variation required'
        }
    },
    category: {
        type: String,
        required: true,
        enum: ['women','men','unisex','skincare','electronics','accessories','home','general']
    },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
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

productSchema.pre('save', function(next) {
    const price = parseFloat(this.price.toString());
    const regularDiscount = this.discountPercent || 0;
    let finalDiscount = regularDiscount;


    if (this.bulkDiscountPercent > 0) {
        const now = new Date();
        const isValidBulkDiscount = (!this.bulkDiscountStartDate || now >= this.bulkDiscountStartDate) &&
            (!this.bulkDiscountEndDate || now <= this.bulkDiscountEndDate);

        if (isValidBulkDiscount) {
            finalDiscount = Math.max(regularDiscount, this.bulkDiscountPercent);
        }
    }

    const finalPrice = price - (price * finalDiscount / 100);
    this.finalPrice = mongoose.Types.Decimal128.fromString(finalPrice.toFixed(2));
    next();
});

productSchema.index({ name: 'text', description: 'text', tags: 'text', brand: 'text' });

module.exports = mongoose.model('Product', productSchema);
