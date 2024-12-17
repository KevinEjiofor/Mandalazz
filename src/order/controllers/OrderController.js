const OrderService = require('../services/OrderService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/responseHandler');

class OrderController {
    static async createOrder(req, res) {
        try {
            const userId = req.user?.id;
            const orderDetails = req.body;

            const newOrder = await OrderService.createOrder(userId, orderDetails);
            sendSuccessResponse(res, { message: 'Order created successfully', order: newOrder });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
    static async deleteOrder(req, res) {
        try {
            const { id: orderId } = req.params;
            const userId = req.user._id;

            const result = await orderService.deleteOrder(orderId, userId);
            sendSuccessResponse(res, result.message);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async getOrders(req, res) {
        try {
            const userId = req.user.id;
            const orders = await OrderService.getOrdersByUser(userId);
            sendSuccessResponse(res, orders);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async updateOrderStatus(req, res) {
        try {
            const { orderId } = req.params;
            const { status } = req.body;

            const updatedOrder = await OrderService.updateOrderStatus(orderId, status);
            sendSuccessResponse(res, { message: 'Order status updated successfully', order: updatedOrder });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
}

module.exports = OrderController;
