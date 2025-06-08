const productService = require('../services/ProductService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');

class ProductController {
    validateCategory(category) {
        const validCategories = ['woman', 'man', 'unisex', 'skincare', 'electronics', 'accessories', 'home'];
        if (category && !validCategories.includes(category)) {
            throw new Error('Invalid category');
        }
    }

    validateSortBy(sortBy) {
        const validSortOptions = [
            'newest', 'oldest', 'price_high_to_low', 'price_low_to_high',
            'rating_high_to_low', 'rating_low_to_high', 'popularity',
            'name_a_to_z', 'name_z_to_a'
        ];

        if (sortBy && !validSortOptions.includes(sortBy)) {
            throw new Error(`Invalid sort option. Valid options are: ${validSortOptions.join(', ')}`);
        }
    }

    async validateAndProcessVariations(variations, files) {
        if (variations) {
            return await productService.processVariations(variations, files);
        }
        return [];
    }

    async addProduct(req, res) {
        try {
            const { name, price, description, category, brand, variations } = req.body;

            const formattedVariations = JSON.parse(variations);

            const result = await productService.addProduct(
                { name, price, description, brand, category },
                req.admin,
                formattedVariations,
                req.files
            );

            sendSuccessResponse(res, "Product created successfully", result);
        } catch (error) {
            console.error("Error in addProduct Controller:", error);
            sendErrorResponse(res, error.message);
        }
    }

    async updateProduct(req, res) {
        try {
            const { name, price, description, category, brand, variations } = req.body;

            this.validateCategory(category);

            const formattedVariations = await this.validateAndProcessVariations(variations, req.files);

            const updateData = {
                name,
                price,
                description,
                brand,
                category,
            };

            const result = await productService.updateProduct(
                req.params.id,
                updateData,
                formattedVariations,
                req.files
            );

            sendSuccessResponse(res, result.message, result.product);
        } catch (error) {
            console.error("Error in updateProduct:", error);
            sendErrorResponse(res, error.message || "Failed to update product");
        }
    }

    async deleteProduct(req, res) {
        try {
            const result = await productService.deleteProduct(req.params.id);
            sendSuccessResponse(res, result.message);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async getAllProducts(req, res) {
        try {
            const { category, sortBy, page = 1, limit = 20 } = req.query;

            // Validate category if provided
            this.validateCategory(category);

            // Validate sortBy if provided
            this.validateSortBy(sortBy);

            const result = await productService.fetchAllProducts(category, sortBy, page, limit);

            sendSuccessResponse(res, 'Products retrieved successfully', result);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async searchProducts(req, res) {
        try {
            const { query, sortBy, category, page = 1, limit = 20 } = req.query;

            if (!query) {
                return sendErrorResponse(res, 'Query parameter is required');
            }

            // Validate category if provided
            this.validateCategory(category);

            // Validate sortBy if provided
            this.validateSortBy(sortBy);

            const result = await productService.searchProducts(query, sortBy, category, page, limit);
            sendSuccessResponse(res, 'Products retrieved successfully', result);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    // New endpoint specifically for getting sort options
    async getSortOptions(req, res) {
        try {
            const sortOptions = [
                { value: 'newest', label: 'Newest Arrivals' },
                { value: 'oldest', label: 'Oldest First' },
                { value: 'price_high_to_low', label: 'Price: High to Low' },
                { value: 'price_low_to_high', label: 'Price: Low to High' },
                { value: 'rating_high_to_low', label: 'Rating: High to Low' },
                { value: 'rating_low_to_high', label: 'Rating: Low to High' },
                { value: 'popularity', label: 'Most Popular' },
                { value: 'name_a_to_z', label: 'Name: A to Z' },
                { value: 'name_z_to_a', label: 'Name: Z to A' }
            ];

            sendSuccessResponse(res, 'Sort options retrieved successfully', { sortOptions });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
}

module.exports = new ProductController();