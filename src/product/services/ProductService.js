const Product = require('../data/models/productModel');
const cloudinary = require('../../utils/cloudinary');

class ProductService {
    async addProduct(productData, admin, variationsData, files) {
        try {
            const formattedVariations = await this.processVariations(variationsData, files);

            const product = await Product.create({
                ...productData,
                variations: formattedVariations,
                createdBy: admin._id,
                adminName: admin.name,
            });

            return { message: 'Product added successfully', product };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async updateProduct(productId, updateData, variationsData, files) {
        try {
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error('Product not found');
            }

            if (variationsData && files) {
                const formattedVariations = await this.processVariations(variationsData, files);
                updateData.variations = formattedVariations;
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

            const deletePromises = product.variations.flatMap((variation) =>
                variation.images.map(async (imageUrl) => {
                    try {
                        const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
                        await cloudinary.uploader.destroy(publicId);
                    } catch (error) {
                        console.warn(`Failed to delete image: ${imageUrl}`);
                    }
                })
            );

            await Promise.all(deletePromises);

            await product.deleteOne();
            return { message: 'Product deleted successfully' };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async fetchAllProducts(category) {
        try {
            const filter = category ? { category } : {};
            const products = await Product.find(filter);
            return products;
        } catch (error) {
            throw new Error(error.message);
        }
    }


    // async fetchAllProducts(category) {
    //     try {
    //
    //         const filter = category ? { category } : {};
    //         const products = await Product.find(filter);
    //
    //         if (!products || products.length === 0) {
    //             throw new Error('No products found');
    //         }
    //
    //         return products;
    //     } catch (error) {
    //         console.error('Error fetching products:', error); // Debug log
    //         throw new Error(error.message);
    //     }
    // }


    async searchProducts(query) {
        try {
            const products = await Product.find(
                { $text: { $search: query } },
                { score: { $meta: 'textScore' } }
            ).sort({ score: { $meta: 'textScore' } });

            if (products.length === 0) {
                return { message: 'Sorry, no products match your search.' };
            }

            return products;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async processVariations(variationsData, files, folder = 'products') {
        try {
            const parsedVariations =
                typeof variationsData === 'string' ? JSON.parse(variationsData) : variationsData;

            if (!Array.isArray(parsedVariations)) {
                throw new Error('Variations should be an array');
            }

            if (!files || !Array.isArray(files)) {
                throw new Error('No image files provided');
            }

            return Promise.all(
                parsedVariations.map(async (variation) => {
                    const colorImages = files
                        .filter((file) => file.originalname.startsWith(variation.color))
                        .map((file) => file.path);

                    if (!colorImages.length) {
                        throw new Error(`No images uploaded for color ${variation.color}`);
                    }

                    const uploadPromises = colorImages.map((path) =>
                        cloudinary.uploader.upload(path, { folder })
                    );
                    const results = await Promise.all(uploadPromises);
                    const imageUrls = results.map((result) => result.secure_url);

                    return {
                        color: variation.color,
                        sizes: variation.sizes,
                        images: imageUrls,
                    };
                })
            );
        } catch (error) {
            throw new Error(`Error processing variations: ${error.message}`);
        }
    }
    // async formatVariations(variations, folder = 'products') {
    //     return Promise.all(
    //         variations.map(async (variation) => {
    //             const uploadPromises = variation.images.map((path) =>
    //                 cloudinary.uploader.upload(path, { folder })
    //             );
    //             const results = await Promise.all(uploadPromises);
    //             const imageUrls = results.map((result) => result.secure_url);
    //
    //             return {
    //                 color: variation.color,
    //                 sizes: variation.sizes,
    //                 images: imageUrls,
    //             };
    //         })
    //     );
    // }



}

module.exports = new ProductService();
