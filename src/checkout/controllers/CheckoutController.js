const CheckoutService = require('../services/CheckoutService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');

class CheckoutController {
    static async createCheckout(req, res) {
        try {
            const { id: userId } = req.user || {};
            const checkoutDetails = req.body;
            const newCheckout = await CheckoutService.createCheckout(userId, checkoutDetails);

            sendSuccessResponse(res, { message: 'Checkout created successfully', checkout: newCheckout });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async deleteCheckout(req, res) {
        try {
            const { id: checkoutId } = req.params;
            const { _id: userId } = req.user;
            const result = await CheckoutService.deleteCheckout(checkoutId, userId);

            sendSuccessResponse(res, result.message);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async getCheckouts(req, res) {
        try {
            const isAdmin = req.user?.role === 'admin';
            const checkouts = isAdmin
                ? await CheckoutService.getAllCheckouts()
                : await CheckoutService.getCheckoutsByUser(req.user.id);

            sendSuccessResponse(res, checkouts);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async updateCheckoutStatus(req, res) {
        try {
            const { checkoutId } = req.params;
            const { status } = req.body;
            const updatedCheckout = await CheckoutService.updateCheckoutStatus(checkoutId, status);

            sendSuccessResponse(res, { message: 'Checkout status updated successfully', checkout: updatedCheckout });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
}

module.exports = CheckoutController;
