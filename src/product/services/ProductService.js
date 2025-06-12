const cloudinary = require('../../utils/cloudinary');
const productRepo = require('../data/repositories/ProductRepository');

class ProductService {

    async addProduct(productData, admin, variationsData, files) {
        if (productData.brandType && !['foreign', 'local'].includes(productData.brandType)) {
            throw new Error('Brand type must be either "foreign" or "local"');
        }

        const formattedVariations = await this.processVariations(variationsData, files);

        const product = await productRepo.createProduct({
            ...productData,
            variations: formattedVariations,
            createdBy: admin._id,
            adminName: admin.name,
        });

        return { message: 'Product added successfully', product };
    }

    async updateProduct(productId, updateData, variationsData, files) {
        const product = await productRepo.findById(productId);
        if (!product) throw new Error('Product not found');

        if (updateData.brandType && !['foreign', 'local'].includes(updateData.brandType)) {
            throw new Error('Brand type must be either "foreign" or "local"');
        }

        if (variationsData && files && files.length > 0) {
            await this.deleteProductImages(product.variations);
            const processedVariations = await this.processVariations(variationsData, files);
            updateData.variations = processedVariations;
        } else if (variationsData && !files) {
            updateData.variations = this.updateVariationsWithoutImages(product.variations, variationsData);
        }

        const cleanUpdateData = Object.fromEntries(
            Object.entries(updateData).filter(([_, value]) => value !== undefined)
        );

        const updatedProduct = await productRepo.updateProduct(product, cleanUpdateData);
        return { message: 'Product updated successfully', product: updatedProduct };
    }

    async deleteProduct(productId) {
        const product = await productRepo.findById(productId);
        if (!product) throw new Error('Product not found');

        await this.deleteProductImages(product.variations);
        await product.deleteOne();

        return { message: 'Product deleted successfully' };
    }

    async getProductById(productId) {
        return await productRepo.findById(productId);
    }

    async fetchAllProducts(category, brandType, sortBy, page = 1, limit = 20) {
        const filter = { isActive: true };
        if (category) filter.category = category;
        if (brandType) {
            if (!['foreign', 'local'].includes(brandType)) throw new Error('Invalid brand type');
            filter.brandType = brandType;
        }

        const skip = (page - 1) * limit;
        const sortOptions = this.buildSortOptions(sortBy);

        const [products, totalProducts] = await Promise.all([
            productRepo.findAll(filter, sortOptions, skip, limit),
            productRepo.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalProducts / limit);
        return {
            products,
            pagination: {
                currentPage: page,
                totalPages,
                totalProducts,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            }
        };
    }

    async searchProducts(query, sortBy, category, brandType, page = 1, limit = 20) {
        const searchFilter = {
            $text: { $search: query },
            isActive: true,
        };
        if (category) searchFilter.category = category;
        if (brandType) {
            if (!['foreign', 'local'].includes(brandType)) throw new Error('Invalid brand type');
            searchFilter.brandType = brandType;
        }

        const skip = (page - 1) * limit;

        let sortOptions;
        if (!sortBy || typeof sortBy !== 'string' || sortBy.trim() === '') {

            sortOptions = { score: { $meta: 'textScore' } };
        } else {
            sortOptions = this.buildSortOptions(sortBy);
        }



        const [products, totalProducts] = await Promise.all([
            productRepo.searchProducts(searchFilter, sortOptions, skip, limit),
            productRepo.countDocuments(searchFilter)
        ]);

        const totalPages = Math.ceil(totalProducts / limit);

        return {
            products,
            pagination: {
                currentPage: page,
                totalPages,
                totalProducts,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
            message: products.length === 0 ? 'Sorry, no products match your search.' : undefined
        };
    }

    async getProductsByBrandType(brandType, page = 1, limit = 20) {
        if (!['foreign', 'local'].includes(brandType)) throw new Error('Invalid brand type');

        const filter = { brandType, isActive: true };
        const skip = (page - 1) * limit;

        const [products, totalProducts] = await Promise.all([
            productRepo.findAll(filter, { createdAt: -1 }, skip, limit),
            productRepo.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalProducts / limit);
        return {
            products,
            brandType,
            pagination: {
                currentPage: page,
                totalPages,
                totalProducts,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            }
        };
    }

    async getFilterOptions() {
        const [categories, brandTypes, brands] = await Promise.all([
            productRepo.getDistinctValues('category', { isActive: true }),
            productRepo.getDistinctValues('brandType', { isActive: true }),
            productRepo.getDistinctValues('brand', { isActive: true, brand: { $ne: null } }),
        ]);

        return {
            categories: categories.sort(),
            brandTypes: brandTypes.sort(),
            brands: brands.sort(),
            sortOptions: this.getSortOptionsList(),
        };
    }

    getSortOptionsList() {
        return [
            { value: 'newest', label: 'Newest First' },
            { value: 'oldest', label: 'Oldest First' },
            { value: 'price_high_to_low', label: 'Price: High to Low' },
            { value: 'price_low_to_high', label: 'Price: Low to High' },
            { value: 'rating_high_to_low', label: 'Rating: High to Low' },
            { value: 'rating_low_to_high', label: 'Rating: Low to High' },
            { value: 'popularity', label: 'Most Popular' },
            { value: 'name_a_to_z', label: 'Name: A to Z' },
            { value: 'name_z_to_a', label: 'Name: Z to A' },
            { value: 'brand_a_to_z', label: 'Brand: A to Z' },
            { value: 'brand_z_to_a', label: 'Brand: Z to A' },
        ];
    }

    buildSortOptions(sortBy) {
        // Ensure sortBy is a string and handle edge cases
        if (!sortBy || typeof sortBy !== 'string') {
            return { createdAt: -1 };
        }

        // Trim whitespace and convert to lowercase for consistent comparison
        const normalizedSortBy = sortBy.trim().toLowerCase();

        const options = {
            newest: { createdAt: -1 },
            oldest: { createdAt: 1 },
            price_high_to_low: { price: -1 },
            price_low_to_high: { price: 1 },
            rating_high_to_low: { rating: -1, reviewCount: -1 },
            rating_low_to_high: { rating: 1 },
            popularity: { reviewCount: -1, rating: -1 },
            name_a_to_z: { name: 1 },
            name_z_to_a: { name: -1 },
            brand_a_to_z: { brand: 1 },
            brand_z_to_a: { brand: -1 },
        };

        // Return the sort option if it exists, otherwise return default
        const sortOption = options[normalizedSortBy] || { createdAt: -1 };
        console.log(`Building sort options for: ${sortBy} -> ${normalizedSortBy}`, sortOption);
        return sortOption;
    }

    async processVariations(variationsData, files, folder = 'products') {
        try {
            const parsed = typeof variationsData === 'string' ? JSON.parse(variationsData) : variationsData;
            if (!Array.isArray(parsed)) throw new Error('Variations should be an array');
            if (!Array.isArray(files)) throw new Error('No image files provided');

            const processedVariations = await Promise.all(parsed.map(async (variation, index) => {
                const images = files
                    .filter((f) => f.originalname.startsWith(variation.color))
                    .map((f) => f.path);

                if (!images.length) {
                    return {
                        ...variation,
                        images: []
                    };
                }

                const uploads = await Promise.all(
                    images.map((path, imgIndex) =>
                        this.uploadWithRetry(path, folder, `${variation.color}_${imgIndex}`)
                    )
                );

                return {
                    ...variation,
                    images: uploads.map(u => u.secure_url)
                };
            }));

            return processedVariations;
        } catch (error) {
            throw new Error(`Error processing variations: ${error.message}`);
        }
    }

    async uploadWithRetry(imagePath, folder, fileName, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await cloudinary.uploader.upload(imagePath, {
                    folder,
                    public_id: fileName,
                    timeout: 120000,
                    resource_type: 'auto',
                    overwrite: true,
                    quality: 'auto:good',
                    fetch_format: 'auto'
                });
            } catch (error) {
                if (attempt === maxRetries) {
                    throw new Error(`Failed to upload ${fileName} after ${maxRetries} attempts: ${error.message}`);
                }
                const waitTime = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    async deleteProductImages(variations) {
        if (!variations || variations.length === 0) return;

        const deletePromises = variations.flatMap((variation) =>
            variation.images.map(async (imageUrl) => {
                try {
                    const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
                    await cloudinary.uploader.destroy(publicId, { timeout: 60000 });
                } catch (err) {
                    console.error(`Failed to delete image: ${imageUrl}`, err);
                }
            })
        );
        await Promise.all(deletePromises);
    }

    updateVariationsWithoutImages(existingVariations, newVariationsData) {
        try {
            const parsed = typeof newVariationsData === 'string' ? JSON.parse(newVariationsData) : newVariationsData;

            return existingVariations.map(existingVariation => {
                const updatedVariation = parsed.find(v => v.color === existingVariation.color);
                if (updatedVariation) {
                    return {
                        ...existingVariation,
                        ...updatedVariation,
                        images: existingVariation.images
                    };
                }
                return existingVariation;
            });
        } catch (error) {
            throw new Error(`Error updating variations: ${error.message}`);
        }
    }


}

module.exports = new ProductService();