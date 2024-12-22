const express = require('express');
const CartController = require('../cart/controller/CartController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/add', CartController.addToCart);
router.get('/', CartController.getCart);
router.delete('/remove', CartController.removeFromCart);

module.exports = router;
