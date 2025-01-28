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
            sendErrorResponse(res, { message: error.message || 'Failed to create checkout.' });
        }
    }
    static async handlePaymentWebhook(req, res) {
        try {

            const { data } = req.body;
            const { reference, status } = data;

            if (!reference || !status) {
                throw new Error('Invalid webhook payload: Missing reference or status');
            }

            await CheckoutService.handlePaymentWebhook(reference, { status });

            sendSuccessResponse(res, { message: 'Payment webhook handled successfully.' });
        } catch (error) {
            console.error('Error handling payment webhook:', error.message);
            sendErrorResponse(res, { message: error.message || 'Failed to handle payment webhook.' });
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
            sendErrorResponse(res, { message: error.message || 'Failed to retrieve checkouts.' });
        }
    }
}

module.exports = CheckoutController;
