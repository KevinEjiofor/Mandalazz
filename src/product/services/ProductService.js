const cloudinary = require('../../config/cloudinary');
const productRepo = require('../data/repositories/ProductRepository');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

class ProductService {
    constructor() {
        this.VALID_BRAND_TYPES = ['foreign', 'local'];
        this.MAX_FILE_SIZE_MB = 10;
        this.DEFAULT_COMPRESSION_QUALITY = 80;
        this.MAX_UPLOAD_RETRIES = 3;
    }

    async addProduct(productData, admin, variationsData, files) {
        try {
            this.validateBrandType(productData.brandType);

            const formattedVariations = await this.processVariations(variationsData, files);

            const product = await productRepo.createProduct({
                ...productData,
                variations: formattedVariations,
                createdBy: admin._id,
                adminName: admin.name,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            return { message: 'Product added successfully', product };
        } catch (error) {
            // Cleanup uploaded files on error
            if (files && files.length > 0) {
                await this.cleanupFiles(files);
            }
            throw error;
        }
    }

    async updateProduct(productId, updateData, variationsData, files) {
        try {
            const product = await productRepo.findById(productId);
            if (!product) {
                throw new Error('Product not found');
            }

            this.validateBrandType(updateData.brandType);

            let processedVariations = product.variations;

            if (variationsData && files && files.length > 0) {
                // Store old images for cleanup after successful update
                const oldImages = product.variations;
                processedVariations = await this.processVariations(variationsData, files);
                updateData.variations = processedVariations;

                // Cleanup old images after successful processing
                await this.deleteProductImages(oldImages);
            } else if (variationsData && !files) {
                processedVariations = this.updateVariationsWithoutImages(product.variations, variationsData);
                updateData.variations = processedVariations;
            }

            const cleanUpdateData = this.cleanUpdateData(updateData);
            cleanUpdateData.updatedAt = new Date();

            const updatedProduct = await productRepo.updateProduct(product, cleanUpdateData);
            return { message: 'Product updated successfully', product: updatedProduct };
        } catch (error) {
            // Cleanup uploaded files on error
            if (files && files.length > 0) {
                await this.cleanupFiles(files);
            }
            throw error;
        }
    }

    async deleteProduct(productId) {
        const product = await productRepo.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        try {
            await this.deleteProductImages(product.variations);
            await product.deleteOne();
            return { message: 'Product deleted successfully' };
        } catch (error) {
            throw new Error('Failed to delete product completely');
        }
    }

    async getProductById(productId) {
        if (!productId) {
            throw new Error('Product ID is required');
        }
        return await productRepo.findById(productId);
    }

    async fetchAllProducts(category, brandType, sortBy, page = 1, limit = 20) {
        const filter = { isActive: true };

        if (category) filter.category = category;
        if (brandType) {
            this.validateBrandType(brandType);
            filter.brandType = brandType;
        }

        const skip = (page - 1) * limit;
        const sortOptions = this.buildSortOptions(sortBy);

        const [products, totalProducts] = await Promise.all([
            productRepo.findAll(filter, sortOptions, skip, limit),
            productRepo.countDocuments(filter)
        ]);

        return this.buildPaginatedResponse(products, page, limit, totalProducts);
    }

    async searchProducts(query, sortBy, category, brandType, page = 1, limit = 20) {
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            throw new Error('Search query is required');
        }

        const searchFilter = {
            $text: { $search: query.trim() },
            isActive: true,
        };

        if (category) searchFilter.category = category;
        if (brandType) {
            this.validateBrandType(brandType);
            searchFilter.brandType = brandType;
        }

        const skip = (page - 1) * limit;
        const sortOptions = this.buildSearchSortOptions(sortBy);

        const [products, totalProducts] = await Promise.all([
            productRepo.searchProducts(searchFilter, sortOptions, skip, limit),
            productRepo.countDocuments(searchFilter)
        ]);

        const response = this.buildPaginatedResponse(products, page, limit, totalProducts);
        if (products.length === 0) {
            response.message = 'Sorry, no products match your search.';
        }

        return response;
    }

    async getProductsByBrandType(brandType, page = 1, limit = 20) {
        this.validateBrandType(brandType);

        const filter = { brandType, isActive: true };
        const skip = (page - 1) * limit;

        const [products, totalProducts] = await Promise.all([
            productRepo.findAll(filter, { createdAt: -1 }, skip, limit),
            productRepo.countDocuments(filter)
        ]);

        const response = this.buildPaginatedResponse(products, page, limit, totalProducts);
        response.brandType = brandType;
        return response;
    }

    async getFilterOptions() {
        try {
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
        } catch (error) {
            throw new Error('Failed to retrieve filter options');
        }
    }

    // Helper methods
    validateBrandType(brandType) {
        if (brandType && !this.VALID_BRAND_TYPES.includes(brandType)) {
            throw new Error(`Brand type must be one of: ${this.VALID_BRAND_TYPES.join(', ')}`);
        }
    }

    cleanUpdateData(updateData) {
        return Object.fromEntries(
            Object.entries(updateData).filter(([_, value]) => value !== undefined)
        );
    }

    buildPaginatedResponse(products, page, limit, totalProducts) {
        const totalPages = Math.ceil(totalProducts / limit);
        return {
            products,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalProducts,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                limit: parseInt(limit)
            }
        };
    }

    buildSearchSortOptions(sortBy) {
        if (!sortBy || typeof sortBy !== 'string' || sortBy.trim() === '') {
            return { score: { $meta: 'textScore' } };
        }
        return this.buildSortOptions(sortBy);
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
        if (!sortBy || typeof sortBy !== 'string') {
            return { createdAt: -1 };
        }

        const normalizedSortBy = sortBy.trim().toLowerCase();
        const sortOptionsMap = {
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

        return sortOptionsMap[normalizedSortBy] || { createdAt: -1 };
    }

    async processVariations(variationsData, files, folder = 'products') {
        try {
            this.validateVariationInputs(variationsData, files);

            const parsedVariations = this.parseVariationsData(variationsData);
            const imageMap = this.extractImageMap(files);

            const processedVariations = await Promise.all(
                parsedVariations.map(async (variation) => {
                    const { color } = variation;
                    if (!color) {
                        throw new Error('Each variation must have a color');
                    }

                    const matchedFiles = this.findMatchingFiles(files, color, imageMap);
                    const imageUrls = await this.uploadVariationImages(matchedFiles, folder);

                    return {
                        ...variation,
                        images: imageUrls
                    };
                })
            );

            return processedVariations;
        } catch (error) {
            throw new Error(`Failed to process variations: ${error.message}`);
        }
    }

    validateVariationInputs(variationsData, files) {
        if (!variationsData) {
            throw new Error('Variations data is required');
        }
        if (!files || !Array.isArray(files) || files.length === 0) {
            throw new Error('Image files are required');
        }
    }

    parseVariationsData(variationsData) {
        try {
            const parsed = typeof variationsData === 'string' ? JSON.parse(variationsData) : variationsData;
            if (!Array.isArray(parsed)) {
                throw new Error('Variations must be an array');
            }
            return parsed;
        } catch (parseError) {
            throw new Error(`Invalid variations data format: ${parseError.message}`);
        }
    }

    extractImageMap(files) {
        const imageMapFile = files.find(f => f.fieldname === 'imageMap');
        if (!imageMapFile || !imageMapFile.buffer) {
            return {};
        }

        try {
            return JSON.parse(imageMapFile.buffer.toString());
        } catch (parseError) {
            return {};
        }
    }

    findMatchingFiles(files, color, imageMap) {
        return files.filter(file => {
            if (file.fieldname === 'imageMap') return false;

            if (Object.keys(imageMap).length > 0) {
                const info = imageMap[file.originalname];
                return info && info.color && info.color.toLowerCase() === color.toLowerCase();
            }

            return file.originalname.toLowerCase().includes(color.toLowerCase());
        });
    }

    async uploadVariationImages(files, folder) {
        return await Promise.all(
            files.map(async (file) => {
                try {
                    const compressedPath = await this.ensureCloudinaryCompatible(file.path);
                    const uploaded = await this.uploadWithRetry(compressedPath, folder, file.originalname);

                    // Cleanup compressed file if different from original
                    if (compressedPath !== file.path) {
                        await this.safeUnlink(compressedPath);
                    }

                    return uploaded.secure_url;
                } catch (uploadError) {
                    throw uploadError;
                }
            })
        );
    }

    async ensureCloudinaryCompatible(filePath, maxSizeKB = 8000) {
        try {
            const stats = await fs.stat(filePath);
            const fileSizeKB = stats.size / 1024;

            if (fileSizeKB <= maxSizeKB) {
                return filePath;
            }

            const compressedPath = filePath.replace(/(\.[^.]+)$/, '_cloudinary_compressed$1');

            let quality = this.calculateCompressionQuality(fileSizeKB);
            let maxWidth = this.calculateMaxWidth(fileSizeKB);

            await sharp(filePath)
                .resize(maxWidth, maxWidth, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({
                    quality: quality,
                    progressive: true,
                    mozjpeg: true
                })
                .toFile(compressedPath);

            return compressedPath;
        } catch (error) {
            return filePath; // Return original if compression fails
        }
    }

    calculateCompressionQuality(fileSizeKB) {
        if (fileSizeKB > 25000) return 30;
        if (fileSizeKB > 15000) return 50;
        return 70;
    }

    calculateMaxWidth(fileSizeKB) {
        if (fileSizeKB > 25000) return 1200;
        if (fileSizeKB > 15000) return 1500;
        return 1800;
    }

    async uploadWithRetry(imagePath, folder, fileName, maxRetries = 3) {
        // Validate inputs
        if (!imagePath || !fileName) {
            throw new Error('Image path and file name are required.');
        }

        // Check if file exists
        try {
            await fs.access(imagePath);
        } catch {
            throw new Error(`File does not exist: ${imagePath}`);
        }

        // Optional: Validate file size (example: max 10MB)
        const stats = await fs.stat(imagePath);
        const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
        if (stats.size > maxSizeInBytes) {
            throw new Error(`File size exceeds 10MB limit: ${fileName}`);
        }

        // Retry loop
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const uploadResult = await cloudinary.uploader.upload(imagePath, {
                    folder,
                    public_id: fileName.split('.')[0],
                    timeout: 120000,
                    resource_type: 'auto',
                    overwrite: true,
                    quality: 'auto:good',
                    fetch_format: 'auto'
                });

                return uploadResult;
            } catch (error) {
                if (attempt === maxRetries) {
                    throw new Error(`Failed to upload ${fileName} after ${maxRetries} attempts: ${error.message}`);
                }

                const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // Exponential backoff with jitter
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    validateUploadInputs(imagePath, fileName) {
        if (!imagePath) throw new Error('Image path is required for upload');
        if (!fileName) throw new Error('File name is required for upload');
    }

    async validateFileSize(imagePath, fileName) {
        const stats = await fs.stat(imagePath);
        const fileSizeMB = stats.size / (1024 * 1024);

        if (fileSizeMB > this.MAX_FILE_SIZE_MB) {
            throw new Error(`File ${fileName} is ${fileSizeMB.toFixed(2)}MB, exceeds ${this.MAX_FILE_SIZE_MB}MB limit`);
        }
    }

    generatePublicId(fileName) {
        const timestamp = Date.now();
        const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `${timestamp}_${cleanName}`;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async deleteProductImages(variations) {
        if (!variations || variations.length === 0) return;

        const deletePromises = variations.flatMap((variation) =>
            (variation.images || []).map(async (imageUrl) => {
                try {
                    const publicId = this.extractPublicId(imageUrl);
                    await cloudinary.uploader.destroy(publicId, { timeout: 60000 });
                } catch (err) {
                    // Silently handle image deletion errors
                }
            })
        );

        await Promise.all(deletePromises);
    }

    extractPublicId(imageUrl) {
        const urlParts = imageUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        const publicId = lastPart.split('.')[0];
        return urlParts.slice(-2, -1)[0] + '/' + publicId;
    }

    updateVariationsWithoutImages(existingVariations, newVariationsData) {
        try {
            const parsedVariations = this.parseVariationsData(newVariationsData);

            return existingVariations.map(existingVariation => {
                const updatedVariation = parsedVariations.find(v => v.color === existingVariation.color);
                if (updatedVariation) {
                    return {
                        ...existingVariation,
                        ...updatedVariation,
                        images: existingVariation.images // Keep existing images
                    };
                }
                return existingVariation;
            });
        } catch (error) {
            throw new Error(`Error updating variations: ${error.message}`);
        }
    }

    async cleanupFiles(files) {
        const cleanupPromises = files.map(async (file) => {
            try {
                await this.safeUnlink(file.path);
            } catch (error) {
                // Silently handle cleanup errors
            }
        });

        await Promise.all(cleanupPromises);
    }

    async safeUnlink(filePath) {
        try {
            await fs.unlink(filePath);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
}

module.exports = new ProductService();