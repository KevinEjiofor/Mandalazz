const mongoose = require('mongoose');
const Product = require('../models/productModel');

class ProductRepository {
    calculateFinalPrice(price, discountPercent) {
        if (!discountPercent || discountPercent <= 0) return price;
        const discount = (price * discountPercent) / 100;
        return Math.round((price - discount) * 100) / 100;
    }

    async createProduct(data) {
        if (data.price && data.discountPercent) {
            const price = parseFloat(data.price.toString());
            const discountPercent = Number(data.discountPercent);
            const finalPrice = this.calculateFinalPrice(price, discountPercent);
            data.finalPrice = mongoose.Types.Decimal128.fromString(finalPrice.toString());
        }
        return Product.create(data);
    }

    async updateProductByIdOptimized(productId, updateData) {
        if (updateData.price || updateData.discountPercent !== undefined) {
            const product = await Product.findById(productId);
            const price = updateData.price ? parseFloat(updateData.price) : parseFloat(product.price);
            const discountPercent = updateData.discountPercent !== undefined ? updateData.discountPercent : (product.discountPercent || 0);
            updateData.finalPrice = this.calculateFinalPrice(price, discountPercent);
        }

        return Product.findByIdAndUpdate(productId, updateData, { new: true, runValidators: true })
            .populate({
                path: 'comments',
                select: 'firstName lastName comment createdAt likes reactions user',
                options: { sort: { createdAt: -1 } }
            });
    }

    async updateProduct(product, updateData) {
        if (updateData.discountStartDate) product.discountStartDate = updateData.discountStartDate;
        if (updateData.discountEndDate) product.discountEndDate = updateData.discountEndDate;

        if (updateData.price || updateData.discountPercent !== undefined) {
            const price = updateData.price ? parseFloat(updateData.price) : parseFloat(product.price);
            const discountPercent = updateData.discountPercent !== undefined ? updateData.discountPercent : (product.discountPercent || 0);
            updateData.finalPrice = this.calculateFinalPrice(price, discountPercent);
        }

        Object.assign(product, updateData);
        return await product.save();
    }

    async applyBulkDiscount(filter, bulkDiscountPercent) {
        const products = await Product.find(filter);
        const bulkUpdateOperations = products.map(product => {
            const finalPrice = this.calculateFinalPrice(parseFloat(product.price), bulkDiscountPercent);
            return {
                updateOne: {
                    filter: { _id: product._id },
                    update: { $set: { bulkDiscountPercent, finalPrice, updatedAt: new Date() } }
                }
            };
        });
        return bulkUpdateOperations.length > 0 ? Product.bulkWrite(bulkUpdateOperations) : null;
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
            .sort(sort).skip(skip).limit(limit);
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
            .sort(sort).skip(skip).limit(limit);
    }

    async getDistinctValues(field, filter = {}) {
        return Product.distinct(field, filter);
    }

    async findByIdWithLimitedComments(id, commentLimit = 10) {
        return Product.findById(id).populate({
            path: 'comments',
            select: 'firstName lastName comment createdAt likes reactions user',
            options: { sort: { createdAt: -1 }, limit: commentLimit }
        });
    }

    async findById(id) {
        return Product.findById(id);
    }

    async findByIdWithoutComments(id) {
        return Product.findById(id);
    }
}

module.exports = new ProductRepository();
