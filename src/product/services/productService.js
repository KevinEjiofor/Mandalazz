const Product = require('../data/models/productModel');
const cloudinary = require('../../utils/cloudinary');

class ProductService {

    async addProduct(productData, admin, imagePath) {
        try {
            const result = await cloudinary.uploader.upload(imagePath, { folder: 'products' });

            const product = await Product.create({
                ...productData,
                imageUrl: result.secure_url,
                createdBy: admin._id,
            });

            return { message: 'Product added successfully', product };
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
                await cloudinary.uploader.destroy(product.imageUrl.split('/').pop());
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


            await cloudinary.uploader.destroy(product.imageUrl.split('/').pop());
            await product.remove();

            return { message: 'Product deleted successfully' };
        } catch (error) {
            throw new Error(error.message);
        }
    }


    async fetchAllProducts() {
        try {
            const products = await Product.find();
            return products;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = new ProductService();
