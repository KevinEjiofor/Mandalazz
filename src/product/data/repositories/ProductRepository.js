const Product = require('../models/productModel');

class ProductRepository {
    async createProduct(data) {
        return Product.create(data);
    }

    async findById(id) {
        return Product.findById(id)
            .populate({
                path: 'comments',
                select: 'firstName lastName comment createdAt likes reactions user',
                options: { sort: { createdAt: -1 } }
            });
    }

    async updateProduct(product, updateData) {
        Object.assign(product, updateData);
        return await product.save();
    }

    async updateProductByIdOptimized(productId, updateData) {
        return Product.findByIdAndUpdate(
            productId,
            updateData,
            {
                new: true,
                runValidators: true
            }
        ).populate({
            path: 'comments',
            select: 'firstName lastName comment createdAt likes reactions user',
            options: { sort: { createdAt: -1 } }
        });
    }

    async deleteProduct(product) {
        return product.deleteOne();
    }

    async findAll(filter, sort, skip, limit) {
        return Product.find(filter)
            .populate({
                path: 'comments',
                select: 'firstName lastName comment createdAt likes reactions user',
                options: { sort: { createdAt: -1 } }
            })
            .sort(sort)
            .skip(skip)
            .limit(limit);
    }

    async countDocuments(filter) {
        return Product.countDocuments(filter);
    }

    async searchProducts(filter, sort, skip, limit) {
        return Product.find(filter)
            .populate({
                path: 'comments',
                select: 'firstName lastName comment createdAt likes reactions user',
                options: { sort: { createdAt: -1 } }
            })
            .sort(sort)
            .skip(skip)
            .limit(limit);
    }

    async getDistinctValues(field, filter = {}) {
        return Product.distinct(field, filter);
    }

    // Additional method to get product with minimal comment data (for performance)
    async findByIdWithLimitedComments(id, commentLimit = 10) {
        return Product.findById(id)
            .populate({
                path: 'comments',
                select: 'firstName lastName comment createdAt likes reactions user',
                options: {
                    sort: { createdAt: -1 },
                    limit: commentLimit
                }
            });
    }

    // Method to get product without comments (for performance when comments not needed)
    async findByIdWithoutComments(id) {
        return Product.findById(id);
    }
}

module.exports = new ProductRepository();