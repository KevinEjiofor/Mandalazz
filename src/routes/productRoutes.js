const express = require('express');
const router = express.Router();
const productController = require('../product/controllers/ProductController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const isAdmin = require('../middlewares/isAdmin');

router.post('/add', authMiddleware, isAdmin,upload, productController.addProduct.bind(productController));
router.put('/update/:id', (req, res, next) => {
    // console.log('Incoming Files:', req.files);
    // console.log('Incoming Body:', req.body);
    next();
}, authMiddleware, isAdmin, upload, productController.updateProduct.bind(productController));

router.delete('/delete/:id', authMiddleware, isAdmin, productController.deleteProduct.bind(productController));
router.get('/', productController.getAllProducts.bind(productController));

module.exports = router;
