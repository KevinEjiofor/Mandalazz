const productService = require('../product/services/ProductService');

class ProductValidator {
    constructor() {
        this.validCategories = [
            'woman',
            'man',
            'unisex',
            'skincare',
            'electronics',
            'accessories',
            'home',
            'general'
        ];

        this.validBrandTypes = ['foreign', 'local'];

        this.validSortOptions = [
            'newest',
            'oldest',
            'price_high_to_low',
            'price_low_to_high',
            'rating_high_to_low',
            'rating_low_to_high',
            'popularity',
            'name_a_to_z',
            'name_z_to_a',
            'brand_a_to_z',
            'brand_z_to_a'
        ];
    }

    validateCategory(category) {
        if (category && !this.validCategories.includes(category)) {
            throw new Error(`Invalid category. Valid options are: ${this.validCategories.join(', ')}`);
        }
        return true;
    }

    validateBrandType(brandType) {
        if (brandType && !this.validBrandTypes.includes(brandType)) {
            throw new Error(`Invalid brand type. Valid options are: ${this.validBrandTypes.join(', ')}`);
        }
        return true;
    }

    validateSortBy(sortBy) {
        if (sortBy && !this.validSortOptions.includes(sortBy)) {
            throw new Error(`Invalid sort option. Valid options are: ${this.validSortOptions.join(', ')}`);
        }
        return true;
    }

    validateRequiredFields(data, requiredFields) {
        const missingFields = [];

        requiredFields.forEach(field => {
            if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
                missingFields.push(field);
            }
        });

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        return true;
    }

    validatePrice(price, discountPrice = null) {
        if (price <= 0) {
            throw new Error('Price must be greater than 0');
        }

        if (discountPrice !== null && discountPrice !== undefined) {
            if (discountPrice <= 0) {
                throw new Error('Discount price must be greater than 0');
            }
            if (discountPrice >= price) {
                throw new Error('Discount price must be less than the original price');
            }
        }
        return true;
    }

    validatePagination(page, limit) {
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;

        if (pageNum < 1) {
            throw new Error('Page number must be greater than 0');
        }

        if (limitNum < 1 || limitNum > 100) {
            throw new Error('Limit must be between 1 and 100');
        }

        return { page: pageNum, limit: limitNum };
    }

    validateSearchQuery(query) {
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            throw new Error('Search query is required and must be a non-empty string');
        }

        if (query.trim().length < 2) {
            throw new Error('Search query must be at least 2 characters long');
        }

        return query.trim();
    }

    async validateAndProcessVariations(variations, files) {
        if (!variations) {
            throw new Error('Product variations are required');
        }

        try {
            const parsedVariations = typeof variations === 'string'
                ? JSON.parse(variations)
                : variations;

            if (!Array.isArray(parsedVariations) || parsedVariations.length === 0) {
                throw new Error('At least one product variation is required');
            }

            // Validate each variation
            parsedVariations.forEach((variation, index) => {
                if (!variation.color || typeof variation.color !== 'string') {
                    throw new Error(`Variation ${index + 1}: Color is required`);
                }

                if (!variation.sizes || !Array.isArray(variation.sizes) || variation.sizes.length === 0) {
                    throw new Error(`Variation ${index + 1}: At least one size is required`);
                }

                variation.sizes.forEach((sizeObj, sizeIndex) => {
                    if (!sizeObj.size) {
                        throw new Error(`Variation ${index + 1}, Size ${sizeIndex + 1}: Size name is required`);
                    }
                    if (sizeObj.stock === undefined || sizeObj.stock < 0) {
                        throw new Error(`Variation ${index + 1}, Size ${sizeIndex + 1}: Stock must be 0 or greater`);
                    }
                });
            });

            return await productService.processVariations(parsedVariations, files);
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error('Invalid variations format. Must be valid JSON');
            }
            throw error;
        }
    }

    validateProductData(productData, isUpdate = false) {
        const requiredFields = isUpdate ? [] : ['name', 'price', 'category', 'brandType'];

        if (!isUpdate) {
            this.validateRequiredFields(productData, requiredFields);
        }

        if (productData.category) {
            this.validateCategory(productData.category);
        }

        if (productData.brandType) {
            this.validateBrandType(productData.brandType);
        }

        if (productData.price) {
            this.validatePrice(productData.price, productData.discountPrice);
        }

        return true;
    }

    validateFilters(filters) {
        const { category, brandType, sortBy, page, limit } = filters;

        if (category) this.validateCategory(category);
        if (brandType) this.validateBrandType(brandType);
        if (sortBy) this.validateSortBy(sortBy);

        const pagination = this.validatePagination(page, limit);

        return {
            ...filters,
            ...pagination
        };
    }

    // Get validation options for frontend
    getValidationOptions() {
        return {
            categories: this.validCategories,
            brandTypes: this.validBrandTypes,
            sortOptions: this.validSortOptions.map(option => ({
                value: option,
                label: this.formatSortOptionLabel(option)
            }))
        };
    }

    formatSortOptionLabel(option) {
        const labelMap = {
            'newest': 'Newest Arrivals',
            'oldest': 'Oldest First',
            'price_high_to_low': 'Price: High to Low',
            'price_low_to_high': 'Price: Low to High',
            'rating_high_to_low': 'Rating: High to Low',
            'rating_low_to_high': 'Rating: Low to High',
            'popularity': 'Most Popular',
            'name_a_to_z': 'Name: A to Z',
            'name_z_to_a': 'Name: Z to A',
            'brand_a_to_z': 'Brand: A to Z',
            'brand_z_to_a': 'Brand: Z to A'
        };

        return labelMap[option] || option;
    }
}

module.exports = new ProductValidator();