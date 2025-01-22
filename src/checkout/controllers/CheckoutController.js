const CheckoutService = require('../services/CheckoutService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');

class CheckoutController {
    static async createCheckout(req, res) {
        try {
            const userId = req.user.id;
            const checkoutDetails = req.body;

            const checkout = await CheckoutService.createCheckout(userId, checkoutDetails);

            if (checkout.paymentUrl) {
                return sendSuccessResponse(res, {
                    message: 'Checkout created. Complete the payment using the provided URL.',
                    checkout: checkout.checkout,
                    paymentUrl: checkout.paymentUrl,
                });
            }

            sendSuccessResponse(res, {
                message: 'Checkout created successfully.',
                checkout,
            });
        } catch (error) {
            sendErrorResponse(res, {
                message: error.message || 'Failed to create checkout.',
            });
        }
    }

    static async handlePaymentWebhook(req, res) {
        try {
            const { event, data } = req.body;
            const reference = data.reference;

            await CheckoutService.handlePaymentWebhook(reference, data);

            sendSuccessResponse(res, {
                message: 'Payment webhook handled successfully.',
            });
        } catch (error) {
            sendErrorResponse(res, {
                message: error.message || 'Failed to handle payment webhook.',
            });
        }
    }

    static async getCheckouts(req, res) {
        try {
            const userId = req.user.id;
            const checkouts = await CheckoutService.getCheckouts(userId);

            sendSuccessResponse(res, {
                message: 'Checkouts retrieved successfully.',
                checkouts,
            });
        } catch (error) {
            sendErrorResponse(res, {
                message: error.message || 'Failed to retrieve checkouts.',
            });
        }
    }

    static async updateCheckoutStatus(req, res) {
        try {
            const { checkoutId } = req.params;
            const { status } = req.body;

            const updatedCheckout = await CheckoutService.updateCheckoutStatus(checkoutId, status);

            sendSuccessResponse(res, {
                message: 'Checkout status updated successfully.',
                checkout: updatedCheckout,
            });
        } catch (error) {
            sendErrorResponse(res, {
                message: error.message || 'Failed to update checkout status.',
            });
        }
    }

    static async deleteCheckout(req, res) {
        try {
            const { id } = req.params;

            await CheckoutService.deleteCheckout(id);

            sendSuccessResponse(res, {
                message: 'Checkout deleted successfully.',
            });
        } catch (error) {
            sendErrorResponse(res, {
                message: error.message || 'Failed to delete checkout.',
            });
        }
    }
}

module.exports = CheckoutController;
