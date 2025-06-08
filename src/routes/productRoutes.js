const express = require('express');
const router = express.Router();
const productController = require('../product/controllers/ProductController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const isAdmin = require('../middlewares/isAdmin');

// Admin routes (require authentication and admin privileges)
router.post('/add', authMiddleware, isAdmin, upload, productController.addProduct.bind(productController));
router.put('/update/:id', authMiddleware, isAdmin, upload, productController.updateProduct.bind(productController));
router.delete('/delete/:id', authMiddleware, isAdmin, productController.deleteProduct.bind(productController));

// Public routes (no authentication required)
router.get('/', productController.getAllProducts.bind(productController));
router.get('/search', productController.searchProducts.bind(productController));
router.get('/sort-options', productController.getSortOptions.bind(productController));

module.exports = router;