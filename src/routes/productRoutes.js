const express = require('express');
const router = express.Router();
const productController = require('../product/controllers/ProductController');
const auth = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');
const { upload, compressUploadedImages } = require('../middlewares/upload');


router.post('/add', auth, isAdmin, upload, compressUploadedImages, productController.addProduct);
router.put('/update/:id', auth, isAdmin, upload, compressUploadedImages, productController.updateProduct);
router.delete('/delete/:id', auth, isAdmin, productController.deleteProduct);

router.get('/', productController.getAllProducts);
router.get('/search', productController.searchProducts);
router.get('/brand-type/:brandType', productController.getProductsByBrandType);
router.get('/filter-options', productController.getFilterOptions);
router.get('/sort-options', productController.getSortOptions);
router.get('/validation-options', productController.getValidationOptions);
router.get('/:id', productController.getProductById);

module.exports = router;