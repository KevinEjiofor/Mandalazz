const express = require('express');
const router = express.Router();
const productController = require('../product/controllers/ProductController');


const isAdmin = require('../middlewares/isAdmin');


router.post('/add', isAdmin, productController.addProduct.bind(productController));
router.put('/update/:id', isAdmin, productController.updateProduct.bind(productController));
router.delete('/delete/:id', isAdmin, productController.deleteProduct.bind(productController));
router.get('/', productController.getAllProducts.bind(productController));

module.exports = router;
