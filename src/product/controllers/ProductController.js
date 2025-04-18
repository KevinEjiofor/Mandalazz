const productService = require('../services/ProductService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');

class ProductController {
    validateCategory(category) {
        const validCategories = ['woman', 'man', 'unisex', 'skincare', 'electronics'];
        if (category && !validCategories.includes(category)) {
            throw new Error('Invalid category');
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
            const { category } = req.query;

            const products = await productService.fetchAllProducts(category);

            sendSuccessResponse(res, 'Products retrieved successfully',products);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }




    async searchProducts(req, res) {
        try {
            const { query } = req.query;

            if (!query) {
                return sendErrorResponse(res, 'Query parameter is required');
            }

            const products = await productService.searchProducts(query);
            sendSuccessResponse(res, 'Products retrieved successfully', products);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
}

module.exports = new ProductController();
