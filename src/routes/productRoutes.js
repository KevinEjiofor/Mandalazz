const express = require('express');
const router = express.Router();
const productController = require('../product/controllers/ProductController');
const auth = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');
const upload = require('../middlewares/upload');

router.post('/add', auth, isAdmin, upload, productController.addProduct.bind(productController));
router.put('/update/:id', auth, isAdmin, upload, productController.updateProduct.bind(productController));
router.delete('/delete/:id', auth, isAdmin, productController.deleteProduct.bind(productController));

router.get('/', productController.getAllProducts.bind(productController));
router.get('/search', productController.searchProducts.bind(productController));
router.get('/brand-type/:brandType', productController.getProductsByBrandType.bind(productController));
router.get('/filter-options', productController.getFilterOptions.bind(productController));
router.get('/sort-options', productController.getSortOptions.bind(productController));
router.get('/validation-options', productController.getValidationOptions.bind(productController));

module.exports = router;
