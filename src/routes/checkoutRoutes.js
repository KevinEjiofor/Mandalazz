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

// Admin routes for general checkout management
router.get('/search', authMiddleware, isAdmin, CheckoutController.searchCheckouts);
router.get('/', authMiddleware, isAdmin, CheckoutController.getCheckouts);
router.get('/:checkoutId', authMiddleware, isAdmin, CheckoutController.getCheckoutById);
router.delete('/:checkoutId', authMiddleware, isAdmin, CheckoutController.cancelCheckout);

// Payment management routes (admin only)
router.post('/verify-payment/:checkoutId', authMiddleware, isAdmin, CheckoutController.verifyPaymentManually);
router.put('/update-payment/:checkoutId', authMiddleware, isAdmin, CheckoutController.updatePaymentStatus);
router.get('/payment-details/:checkoutId', authMiddleware, isAdmin, CheckoutController.getPaymentDetails);

// Delivery management routes (admin only)
router.put('/update-delivery/:checkoutId', authMiddleware, isAdmin, CheckoutController.updateDeliveryStatus);
router.post('/assign-agent/:checkoutId', authMiddleware, isAdmin, CheckoutController.assignDeliveryAgent);
router.patch('/update-address/:checkoutId', authMiddleware, isAdmin, CheckoutController.adminUpdateCheckoutAddress);

// Delivery payment routes (admin only)
router.post('/record-delivery-payment/:checkoutId', authMiddleware, isAdmin, CheckoutController.recordDeliveryPayment);
router.post('/confirm-delivery-payment/:checkoutId', authMiddleware, isAdmin, CheckoutController.confirmDeliveryPayment);
router.get('/pending-delivery-payments', authMiddleware, isAdmin, CheckoutController.getPendingDeliveryPayments);

// Analytics routes (admin only)
router.get('/analytics/payment-methods-enhanced', authMiddleware, isAdmin, CheckoutController.getEnhancedPaymentStatistics);

// Public routes
router.post('/webhook', CheckoutController.handlePaymentWebhook);
router.get('/status/:checkoutId', CheckoutController.getCheckoutStatus);

module.exports = router;