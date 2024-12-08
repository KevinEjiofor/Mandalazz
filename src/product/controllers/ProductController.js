const productService = require('../services/ProductService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/responseHandler');

class ProductController {
    async addProduct(req, res) {
        const { name, price, description } = req.body;

        try {
            const result = await productService.addProduct(
                { name, price, description },
                req.admin,
                req.file?.path
            );
            sendSuccessResponse(res, result);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async updateProduct(req, res) {
        const { name, price, description } = req.body;

        try {
            const result = await productService.updateProduct(
                req.params.id,
                { name, price, description },
                req.file?.path
            );
            sendSuccessResponse(res, result);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async deleteProduct(req, res) {
        try {
            const result = await productService.deleteProduct(req.params.id);
            sendSuccessResponse(res, result);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async getAllProducts(req, res) {
        try {
            const products = await productService.fetchAllProducts();
            sendSuccessResponse(res, products);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
}

module.exports = new ProductController();
