const express = require('express');
const CheckoutController = require('../checkout/controllers/CheckoutController');
const authMiddleware = require('../middlewares/authMiddleware');
const isUser = require('../middlewares/isUser');

const router = express.Router();

router.post('/create',authMiddleware,  CheckoutController.createCheckout);

router.post('/webhook', CheckoutController.handlePaymentWebhook);
router.get('/', authMiddleware, CheckoutController.getCheckouts);
router.patch('/:checkoutId/status', authMiddleware, CheckoutController.updateCheckoutStatus);
router.delete('/:id', authMiddleware, CheckoutController.deleteCheckout);

module.exports = router;
