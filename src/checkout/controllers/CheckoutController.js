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
            const checkouts = await CheckoutService.getCheckouts();
            sendSuccessResponse(res, {
                message: 'Checkouts retrieved successfully.',
                checkouts,
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to retrieve checkouts.' });
        }
    }

    static async updatePaymentStatus(req, res) {
        try {
            const { checkoutId } = req.params;
            const { paymentStatus } = req.body;

            const updatedCheckout = await CheckoutService.updatePaymentStatus(checkoutId, paymentStatus);

            sendSuccessResponse(res, {
                message: 'Payment status updated successfully.',
                checkout: updatedCheckout,
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to update payment status.' });
        }
    }

    static async getCheckoutById(req, res) {
        try {
            const { checkoutId } = req.params;
            const checkout = await CheckoutService.getCheckoutById(checkoutId);

            if (!checkout) {
                return sendErrorResponse(res, { message: 'Checkout not found' }, 404);
            }

            sendSuccessResponse(res, {
                message: 'Checkout retrieved successfully.',
                checkout,
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to retrieve checkout.' });
        }
    }

    static async cancelCheckout(req, res) {
        try {
            const { checkoutId } = req.params;
            const result = await CheckoutService.cancelCheckout(checkoutId);

            sendSuccessResponse(res, {
                message: 'Checkout canceled successfully.',
                checkout: result,
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to cancel checkout.' });
        }
    }

    static async getCheckoutStatus(req, res) {
        try {
            const { checkoutId } = req.params;
            const checkout = await CheckoutService.getCheckoutById(checkoutId);

            if (!checkout) {
                return sendErrorResponse(res, { message: 'Checkout not found' }, 404);
            }

            sendSuccessResponse(res, {
                message: 'Checkout status retrieved successfully.',
                status: checkout.deliveryStatus,
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to retrieve checkout status.' });
        }
    }

    static async updateDeliveryStatus(req, res) {
        try {
            const { checkoutId } = req.params;
            const { deliveryStatus } = req.body;

            const updatedCheckout = await CheckoutService.updateDeliveryStatus(checkoutId, deliveryStatus);

            sendSuccessResponse(res, {
                message: 'Delivery status updated successfully.',
                checkout: updatedCheckout,
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to update delivery status.' });
        }
    }

    static async searchCheckouts(req, res) {
        try {
            const results = await CheckoutService.searchCheckouts(req.query);

            sendSuccessResponse(res, {
                message: 'Checkouts search successful.',
                results,
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Search failed.' });
        }
    }
}

module.exports = CheckoutController;