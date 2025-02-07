const express = require('express');
const CheckoutController = require('../checkout/controllers/CheckoutController');
const authMiddleware = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');

const router = express.Router();

router.get('/search', authMiddleware, isAdmin, CheckoutController.searchCheckouts);
router.post('/create', authMiddleware, CheckoutController.createCheckout);
router.post('/webhook',authMiddleware,isAdmin, CheckoutController.handlePaymentWebhook);
router.get('/', authMiddleware, isAdmin,CheckoutController.getCheckouts);
router.put('/update-payment/:checkoutId', authMiddleware, isAdmin, CheckoutController.updatePaymentStatus);
router.get('/:checkoutId', authMiddleware,isAdmin, CheckoutController.getCheckoutById);
router.delete('/:checkoutId', authMiddleware,isAdmin, CheckoutController.cancelCheckout);
router.get('/status/:checkoutId', CheckoutController.getCheckoutStatus);
router.put('/update-delivery/:checkoutId', authMiddleware, isAdmin, CheckoutController.updateDeliveryStatus);

module.exports = router;
