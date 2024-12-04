const productService = require('../services/productService');

class ProductController {
    async addProduct(req, res) {
        const { name, price, description } = req.body;

        try {
            const result = await productService.addProduct(
                { name, price, description },
                req.admin,
                req.file.path
            );
            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateProduct(req, res) {
        const { name, price, description } = req.body;

        try {
            const result = await productService.updateProduct(
                req.params.id,
                { name, price, description },
                req.file?.path // optional image update
            );
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async deleteProduct(req, res) {
        try {
            const result = await productService.deleteProduct(req.params.id);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAllProducts(req, res) {
        try {
            const products = await productService.fetchAllProducts();
            res.status(200).json(products);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new ProductController();
