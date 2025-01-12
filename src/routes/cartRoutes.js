const express = require('express');
const CartController = require('../cart/controller/CartController');
const authMiddleware = require('../middlewares/authMiddleware');
const guestMiddleware = require('../middlewares/guestMiddleware');

const router = express.Router();

const optionalAuthMiddleware = (req, res, next) => {
    if (req.headers.authorization) {
        return authMiddleware(req, res, next);
    }
    guestMiddleware(req, res, next);
};

router.post('/add', optionalAuthMiddleware, CartController.addToCart);
router.get('/', optionalAuthMiddleware, CartController.getCart);
router.put('/update', optionalAuthMiddleware, CartController.updateItem);
router.delete('/remove', optionalAuthMiddleware, CartController.removeItem);
router.delete('/clear', optionalAuthMiddleware, CartController.clearCart);

module.exports = router;
