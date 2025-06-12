const productService = require('../services/ProductService');
const productValidator = require('../../utils/ProductValidator');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');

class ProductController {
    async addProduct(req, res) {
        try {
            const { name, price, description, category, brand, brandType, variations } = req.body;


            productValidator.validateProductData({ name, price, category, brandType });

            const result = await productService.addProduct(
                { name, price, description, brand, category, brandType },
                req.admin,
                variations,
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
            const productId = req.params.id;
            if (!productId) {
                return sendErrorResponse(res, "Product ID is required", 400);
            }

            const {
                name,
                price,
                description,
                category,
                brand,
                brandType,
                variations
            } = req.body;

            // Step 1: Validate the input data (only fields provided)
            const dataToValidate = { name, price, category, brandType };
            const filteredData = Object.fromEntries(
                Object.entries(dataToValidate).filter(([_, value]) => value !== undefined)
            );

            if (Object.keys(filteredData).length > 0) {
                productValidator.validateProductData(filteredData, true);
            }

            const updateData = { name, price, description, category, brand, brandType };
            const cleanUpdateData = Object.fromEntries(
                Object.entries(updateData).filter(([_, value]) => value !== undefined)
            );

            const result = await productService.updateProduct(
                productId,
                cleanUpdateData,
                variations,
                req.files
            );

            sendSuccessResponse(res, result.message, result.product);
        } catch (error) {
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
            const validatedFilters = productValidator.validateFilters(req.query);
            const { category, brandType, sortBy, page, limit } = validatedFilters;

            const result = await productService.fetchAllProducts(category, brandType, sortBy, page, limit);
            sendSuccessResponse(res, 'Products retrieved successfully', result);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async getProductById(req, res) {
        try {
            const product = await productService.getProductById(req.params.id);
            if (!product) return sendErrorResponse(res, 'Product not found', 404);
            sendSuccessResponse(res, 'Product retrieved successfully', product);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async searchProducts(req, res) {
        try {
            const { query, sortBy, category, brandType, page, limit } = req.query;
            const validatedQuery = productValidator.validateSearchQuery(query);
            const validatedFilters = productValidator.validateFilters({ category, brandType, sortBy, page, limit });

            const result = await productService.searchProducts(
                validatedQuery,
                validatedFilters.sortBy,
                validatedFilters.category,
                validatedFilters.brandType,
                validatedFilters.page,
                validatedFilters.limit
            );

            sendSuccessResponse(res, 'Products retrieved successfully', result);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async getProductsByBrandType(req, res) {
        try {
            const { brandType } = req.params;
            productValidator.validateBrandType(brandType);
            const { page, limit } = productValidator.validatePagination(req.query.page, req.query.limit);

            const result = await productService.getProductsByBrandType(brandType, page, limit);
            sendSuccessResponse(res, 'Products retrieved successfully', result);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async getFilterOptions(req, res) {
        try {
            const result = await productService.getFilterOptions();
            sendSuccessResponse(res, 'Filter options retrieved successfully', result);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async getSortOptions(req, res) {
        try {
            const { sortOptions } = productValidator.getValidationOptions();
            sendSuccessResponse(res, 'Sort options retrieved successfully', { sortOptions });
        } catch (err) {
            sendErrorResponse(res, err.message);
        }
    }

    async getValidationOptions(req, res) {
        try {
            const opts = productValidator.getValidationOptions();
            sendSuccessResponse(res, 'Validation options retrieved successfully', opts);
        } catch (err) {
            sendErrorResponse(res, err.message);
        }
    }
}

module.exports = new ProductController();
