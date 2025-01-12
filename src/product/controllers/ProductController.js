const productService = require('../services/ProductService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');


class ProductController {
    async addProduct(req, res) {
        try {
            const { name, price, description, sizes } = req.body;

            const filePaths = req.files?.map(file => file.path) || [];
            const formattedSizes = Array.isArray(sizes) ? sizes : [sizes];

            const result = await productService.addProduct(
                { name, price, description, sizes: formattedSizes },
                req.admin,
                filePaths
            );

            sendSuccessResponse(res,  'Product has been successfully uploaded.');
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async updateProduct(req, res) {
        try {

            const { name, price, description, sizes } = req.body;

            const filePaths = req.files?.map(file => file.path) || [];
            const formattedSizes = Array.isArray(sizes) ? sizes : [sizes];

            const result = await productService.updateProduct(
                req.params.id,
                { name, price, description, sizes: formattedSizes },
                filePaths
            );

            sendSuccessResponse(res,  'Product has been successfully updated.');
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async deleteProduct(req, res) {
        try {
            const result = await productService.deleteProduct(req.params.id);
            sendSuccessResponse(res,  'Product has been successfully deleted.');
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

    async searchProducts(req, res) {
        try {
            const { query } = req.query;

            if (!query) {
                return sendErrorResponse(res, 'Query parameter is required');
            }

            const products = await productService.searchProducts(query);
            sendSuccessResponse(res, products);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

}

module.exports = new ProductController();

