const productRepo = require('../data/repositories/ProductRepository');
const ImageService = require('./ImageService');
const PriceService = require('./PriceService');
const ProductValidator = require('../../utils/ProductValidator');

class ProductService {
    constructor() {
        this.imageService = new ImageService();
        this.priceService = new PriceService();
        this.validationService = new ProductValidator();
    }

    async addProduct(productData, admin, variationsData, files) {
        try {
            this.validationService.validateProductData(productData);

            const finalPrice = this.priceService.calculateFinalPrice(
                parseFloat(productData.price),
                Number(productData.discountPercent) || 0
            );

            const formattedVariations = await this.validationService.validateAndProcessVariations(
                variationsData,
                files,
                this.imageService
            );

            const productToCreate = {
                ...productData,
                ...this.priceService.formatPriceData(productData.price, productData.discountPercent, finalPrice),
                variations: formattedVariations,
                createdBy: admin._id,
                adminName: admin.name,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const product = await productRepo.createProduct(productToCreate);
            return { message: 'Product added successfully', product };
        } catch (error) {
            if (files?.length > 0) {
                await this.imageService.cleanupFiles(files);
            }
            throw error;
        }
    }

    async updateProduct(productId, updateData, variationsData, files) {
        try {
            const product = await productRepo.findById(productId);
            if (!product) throw new Error('Product not found');

            this.validationService.validateProductData(updateData, true);

            // Handle price updates
            if (updateData.price || updateData.discountPercent !== undefined) {
                Object.assign(updateData, this.priceService.calculateUpdatedPricing(product, updateData));
            }

            // Handle variations
            if (variationsData && files?.length > 0) {
                const oldImages = product.variations;
                updateData.variations = await this.validationService.validateAndProcessVariations(
                    variationsData,
                    files,
                    this.imageService
                );
                await this.imageService.deleteProductImages(oldImages);
            } else if (variationsData) {
                updateData.variations = this.imageService.updateVariationsWithoutImages(
                    product.variations,
                    variationsData
                );
            }

            const updatedProduct = await productRepo.updateProduct(product, {
                ...updateData,
                updatedAt: new Date()
            });

            return { message: 'Product updated successfully', product: updatedProduct };
        } catch (error) {
            if (files?.length > 0) {
                await this.imageService.cleanupFiles(files);
            }
            throw error;
        }
    }

    async applyBulkDiscount(category, bulkDiscountPercent, startDate = null, endDate = null) {
        this.validationService.validateBulkDiscount(bulkDiscountPercent, startDate, endDate);

        const filter = category ? { category } : {};
        const products = await productRepo.findAll(filter);

        const updatePromises = products.map(product => {
            const originalPrice = parseFloat(product.price.toString());
            const finalPrice = this.priceService.calculateFinalPrice(originalPrice, bulkDiscountPercent);

            return productRepo.updateProduct(product, {
                bulkDiscountPercent,
                bulkDiscountStartDate: startDate,
                bulkDiscountEndDate: endDate,
                ...this.priceService.formatPriceData(null, null, finalPrice),
                updatedAt: new Date()
            });
        });

        await Promise.all(updatePromises);

        const durationMsg = startDate && endDate
            ? ` (valid from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()})`
            : '';

        return {
            message: `Bulk discount of ${bulkDiscountPercent}% applied successfully${durationMsg}`,
            affectedProducts: products.length
        };
    }

    async deleteProduct(productId) {
        const product = await productRepo.findById(productId);
        if (!product) throw new Error('Product not found');

        try {
            await this.imageService.deleteProductImages(product.variations);
            await product.deleteOne();
            return { message: 'Product deleted successfully' };
        } catch (error) {
            throw new Error('Failed to delete product completely');
        }
    }

    async getProductById(productId) {
        if (!productId) throw new Error('Product ID is required');
        return await productRepo.findById(productId);
    }

    async fetchAllProducts(category, brandType, sortBy, page = 1, limit = 20) {
        const filter = { isActive: true };
        if (category) filter.category = category;
        if (brandType) {
            this.validationService.validateBrandType(brandType);
            filter.brandType = brandType;
        }

        const skip = (page - 1) * limit;
        const sortOptions = this.validationService.buildSortOptions(sortBy);

        const [products, totalProducts] = await Promise.all([
            productRepo.findAll(filter, sortOptions, skip, limit),
            productRepo.countDocuments(filter)
        ]);

        return this.validationService.buildPaginatedResponse(products, page, limit, totalProducts);
    }

    async searchProducts(query, sortBy, category, brandType, page = 1, limit = 20) {
        if (!query?.trim()) throw new Error('Search query is required');

        const searchFilter = {
            $text: { $search: query.trim() },
            isActive: true,
        };

        if (category) searchFilter.category = category;
        if (brandType) {
            this.validationService.validateBrandType(brandType);
            searchFilter.brandType = brandType;
        }

        const skip = (page - 1) * limit;
        const sortOptions = this.validationService.buildSearchSortOptions(sortBy);

        const [products, totalProducts] = await Promise.all([
            productRepo.searchProducts(searchFilter, sortOptions, skip, limit),
            productRepo.countDocuments(searchFilter)
        ]);

        const response = this.validationService.buildPaginatedResponse(products, page, limit, totalProducts);
        if (products.length === 0) {
            response.message = 'Sorry, no products match your search.';
        }

        return response;
    }

    async getProductsByBrandType(brandType, page = 1, limit = 20) {
        this.validationService.validateBrandType(brandType);

        const filter = { brandType, isActive: true };
        const skip = (page - 1) * limit;

        const [products, totalProducts] = await Promise.all([
            productRepo.findAll(filter, { createdAt: -1 }, skip, limit),
            productRepo.countDocuments(filter)
        ]);

        const response = this.validationService.buildPaginatedResponse(products, page, limit, totalProducts);
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
                sortOptions: this.validationService.getSortOptionsList(),
            };
        } catch (error) {
            throw new Error('Failed to retrieve filter options');
        }
    }

    async removeBulkDiscount(category = null) {
        const filter = category ? { category } : {};
        const products = await productRepo.findAll(filter);

        const updatePromises = products.map(product => {
            return productRepo.updateProduct(product, {
                bulkDiscountPercent: 0,
                bulkDiscountStartDate: null,
                bulkDiscountEndDate: null,
                ...this.priceService.formatPriceData(
                    null,
                    null,
                    this.priceService.calculateFinalPrice(
                        parseFloat(product.price.toString()),
                        product.discountPercent || 0
                    )
                ),
                updatedAt: new Date()
            });
        });

        await Promise.all(updatePromises);
        return {
            message: `Bulk discount removed successfully${category ? ` for ${category} category` : ''}`,
            affectedProducts: products.length
        };
    }

    async setProductDiscount(productId, discountPercent, startDate = null, endDate = null) {
        const product = await productRepo.findById(productId);
        if (!product) throw new Error('Product not found');

        this.validationService.validateDiscount(discountPercent);

        // Validate dates if provided
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (start > end) {
                throw new Error('Start date must be before end date');
            }
        }

        const price = parseFloat(product.price.toString());
        const finalPrice = this.priceService.calculateFinalPrice(price, discountPercent);

        const updateData = {
            discountPercent,
            discountStartDate: startDate ? new Date(startDate) : null,
            discountEndDate: endDate ? new Date(endDate) : null,
            finalPrice: finalPrice, // Let the repository handle Decimal128 conversion
            updatedAt: new Date()
        };

        const updatedProduct = await productRepo.updateProduct(product, updateData);

        return {
            message: `Discount ${discountPercent}% applied successfully to product`,
            product: updatedProduct
        };
    }

    async removeProductDiscount(productId) {
        const product = await productRepo.findById(productId);
        if (!product) throw new Error('Product not found');

        const price = parseFloat(product.price.toString());
        const finalPrice = this.priceService.calculateFinalPrice(price, 0);

        const updatedProduct = await productRepo.updateProduct(product, {
            ...this.priceService.formatPriceData(null, 0, finalPrice),
            updatedAt: new Date()
        });

        return {
            message: 'Product discount removed successfully',
            product: updatedProduct
        };
    }
}

module.exports = new ProductService();