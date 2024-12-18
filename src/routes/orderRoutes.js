const express = require('express');
const OrderController = require('../order/controllers/OrderController');
const authMiddleware = require('../middlewares/authMiddleware')
const isAdmin = require('../middlewares/isAdmin');
const  isUserOrAdmin = require('../middlewares/isUser')

const router = express.Router();

router.post('/create', authMiddleware, OrderController.createOrder);
router.get('/', authMiddleware, isUserOrAdmin, OrderController.getOrders);
router.patch('/:orderId/status', authMiddleware, OrderController.updateOrderStatus);
router.delete('/:id', authMiddleware, OrderController.deleteOrder);
module.exports = router;
