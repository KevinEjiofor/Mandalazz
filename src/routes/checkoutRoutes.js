const express = require('express');
const CheckoutController = require('../checkout/controllers/CheckoutController');
const authMiddleware = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');

const router = express.Router();

router.post('/create', authMiddleware, CheckoutController.createCheckout);
router.get('/', authMiddleware, isAdmin, CheckoutController.getCheckouts);
router.patch('/:checkoutId/status', authMiddleware, CheckoutController.updateCheckoutStatus);
router.delete('/:id', authMiddleware, CheckoutController.deleteCheckout);

module.exports = router;
