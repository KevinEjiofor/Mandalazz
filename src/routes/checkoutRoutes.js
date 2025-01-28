const express = require('express');
const CheckoutController = require('../checkout/controllers/CheckoutController');
const authMiddleware = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');

const router = express.Router();

router.post('/create', authMiddleware, CheckoutController.createCheckout);
router.post('/webhook',authMiddleware,isAdmin, CheckoutController.handlePaymentWebhook);
router.get('/', authMiddleware, isAdmin,CheckoutController.getCheckouts);

module.exports = router;
