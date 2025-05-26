const express = require('express');
const CartController = require('../cart/controller/CartController');
const optionalAuthMiddleware = require('../middlewares/optionalAuthMiddleware')

const router = express.Router();



router.post('/add', optionalAuthMiddleware, CartController.addToCart);
router.get('/', optionalAuthMiddleware, CartController.getCart);
router.put('/update', optionalAuthMiddleware, CartController.updateItem);
router.delete('/remove', optionalAuthMiddleware, CartController.removeItem);
router.delete('/clear', optionalAuthMiddleware, CartController.clearCart);

module.exports = router;
