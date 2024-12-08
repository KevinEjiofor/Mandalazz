const Product = require('../data/models/productModel');
const cloudinary = require('../../utils/cloudinary');
const adminModel = require('../../admin/data/repositories/adminRepository');

class ProductService {
    async addProduct(productData, admin, imagePath) {

        try {

            const result = await cloudinary.uploader.upload(imagePath, { folder: 'products' });

            const product = await Product.create({
                ...productData,

                imageUrl: result.secure_url,
                createdBy:admin._id,
            });


            return { message: 'Product added successfully'};
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async updateProduct(productId, updateData, imagePath) {
        try {
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error('Product not found');
            }

            if (imagePath) {
                const result = await cloudinary.uploader.upload(imagePath, { folder: 'products' });
                await cloudinary.uploader.destroy(product.imageUrl.split('/').pop()); // Remove old image
                product.imageUrl = result.secure_url;
            }

            Object.assign(product, updateData);
            await product.save();

            return { message: 'Product updated successfully', product };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async deleteProduct(productId) {
        try {
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error('Product not found');
            }

            await cloudinary.uploader.destroy(product.imageUrl.split('/').pop()); // Remove image from Cloudinary
            await product.remove(); // Delete the product

            return { message: 'Product deleted successfully' };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async fetchAllProducts() {
        try {
            return await Product.find(); // Fetch all products from the database
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = new ProductService();
