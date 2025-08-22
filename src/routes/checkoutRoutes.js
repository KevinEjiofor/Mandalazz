const express = require('express');
const CheckoutController = require('../checkout/controllers/CheckoutController');
const authMiddleware = require('../middlewares/authMiddleware');
const isUser = require("../middlewares/isUser");
const isAdmin = require('../middlewares/isAdmin');

const router = express.Router();

// User routes
router.post('/create', authMiddleware, isUser, CheckoutController.createCheckout);
router.get('/my-orders', authMiddleware, isUser, CheckoutController.getUserCheckouts);
router.get('/delivered-orders', authMiddleware, isUser, CheckoutController.getDeliveredOrders);

// Admin routes
router.get('/search', authMiddleware, isAdmin, CheckoutController.searchCheckouts);
router.get('/', authMiddleware, isAdmin, CheckoutController.getCheckouts);
router.put('/update-payment/:checkoutId', authMiddleware, isAdmin, CheckoutController.updatePaymentStatus);
router.get('/:checkoutId', authMiddleware, isAdmin, CheckoutController.getCheckoutById);
router.delete('/:checkoutId', authMiddleware, isAdmin, CheckoutController.cancelCheckout);
router.put('/update-delivery/:checkoutId', authMiddleware, isAdmin, CheckoutController.updateDeliveryStatus);

// Public routes
router.post('/webhook', CheckoutController.handlePaymentWebhook);
router.get('/status/:checkoutId', CheckoutController.getCheckoutStatus);

module.exports = router;