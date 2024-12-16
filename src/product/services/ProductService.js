const Product = require('../data/models/productModel');
const cloudinary = require('../../utils/cloudinary');


class ProductService {
    async addProduct(productData, admin, imagePaths) {
        try {

            const uploadPromises = imagePaths.map((path) =>
                cloudinary.uploader.upload(path, { folder: 'products' })
            );
            const results = await Promise.all(uploadPromises);


            const imageUrls = results.map((result) => result.secure_url);

            const product = await Product.create({
                ...productData,
                imageUrls,
                sizes: productData.sizes,
                createdBy: admin._id,
                // adminName: admin.name
            });

            return { message: 'Product added successfully', product };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async updateProduct(productId, updateData, imagePaths) {
        try {

            const product = await Product.findById(productId);
            if (!product) {
                throw new Error('Product not found');
            }

            if (imagePaths && imagePaths.length > 0) {

                const deletePromises = product.imageUrls.map((url) =>
                    cloudinary.uploader.destroy(url.split('/').slice(-2).join('/').split('.')[0])
                );
                await Promise.all(deletePromises);


                const uploadPromises = imagePaths.map((path) =>
                    cloudinary.uploader.upload(path, { folder: 'products' })
                );
                const results = await Promise.all(uploadPromises);
                product.imageUrls = results.map((result) => result.secure_url);


            }


            console.log("Update Data:", updateData);
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

            for (const oldImage of product.imageUrls) {
                const publicId = oldImage.split('/').slice(-2).join('/').split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }

            await product.deleteOne();
            return { message: 'Product deleted successfully' };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async fetchAllProducts() {
        try {
            return await Product.find();
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = new ProductService();
