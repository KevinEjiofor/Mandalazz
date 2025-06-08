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

    async fetchAllProducts(category, sortBy, page = 1, limit = 20) {
        try {
            const filter = category ? { category, isActive: true } : { isActive: true };

            // Calculate skip for pagination
            const skip = (page - 1) * limit;

            // Build sort object
            const sortOptions = this.buildSortOptions(sortBy);

            const products = await Product.find(filter)
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit));

            // Get total count for pagination
            const totalProducts = await Product.countDocuments(filter);
            const totalPages = Math.ceil(totalProducts / limit);

            return {
                products,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalProducts,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    buildSortOptions(sortBy) {
        const sortOptions = {};

        switch (sortBy) {
            case 'newest':
                sortOptions.createdAt = -1; // Newest first
                break;
            case 'oldest':
                sortOptions.createdAt = 1; // Oldest first
                break;
            case 'price_high_to_low':
                sortOptions.price = -1; // Highest price first
                break;
            case 'price_low_to_high':
                sortOptions.price = 1; // Lowest price first
                break;
            case 'rating_high_to_low':
                sortOptions.rating = -1; // Highest rating first
                sortOptions.reviewCount = -1; // More reviews as secondary sort
                break;
            case 'rating_low_to_high':
                sortOptions.rating = 1; // Lowest rating first
                break;
            case 'popularity':
                // Sort by review count (more reviews = more popular) and rating
                sortOptions.reviewCount = -1;
                sortOptions.rating = -1;
                break;
            case 'name_a_to_z':
                sortOptions.name = 1; // Alphabetical A-Z
                break;
            case 'name_z_to_a':
                sortOptions.name = -1; // Alphabetical Z-A
                break;
            default:
                // Default sort by newest
                sortOptions.createdAt = -1;
                break;
        }

        return sortOptions;
    }

    async searchProducts(query, sortBy, category, page = 1, limit = 20) {
        try {
            // Build search filter
            const searchFilter = {
                $text: { $search: query },
                isActive: true
            };

            // Add category filter if provided
            if (category) {
                searchFilter.category = category;
            }

            // Calculate skip for pagination
            const skip = (page - 1) * limit;

            // Build sort options
            let sortOptions;
            if (sortBy) {
                sortOptions = this.buildSortOptions(sortBy);
            } else {
                // For search, default to relevance score
                sortOptions = { score: { $meta: 'textScore' } };
            }

            const products = await Product.find(
                searchFilter,
                { score: { $meta: 'textScore' } }
            )
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit));

            if (products.length === 0) {
                return {
                    message: 'Sorry, no products match your search.',
                    products: [],
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: 0,
                        totalProducts: 0,
                        hasNextPage: false,
                        hasPrevPage: false
                    }
                };
            }

            // Get total count for pagination
            const totalProducts = await Product.countDocuments(searchFilter);
            const totalPages = Math.ceil(totalProducts / limit);

            return {
                products,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalProducts,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
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
}

module.exports = new ProductService();