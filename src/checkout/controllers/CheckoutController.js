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
            const { data, event } = req.body;

            if (!data) {
                return sendErrorResponse(res, { message: 'Invalid webhook payload: No data' }, 400);
            }

            const { reference } = data;
            if (!reference) {
                return sendErrorResponse(res, { message: 'Invalid webhook payload: Missing reference' }, 400);
            }

            const updatedCheckout = await CheckoutService.handlePaymentWebhook(reference, data);

            sendSuccessResponse(res, {
                message: 'Payment webhook handled successfully.',
                orderNumber: updatedCheckout.orderNumber,
                paymentStatus: updatedCheckout.paymentStatus
            });
        } catch (error) {
            sendSuccessResponse(res, {
                message: 'Webhook received',
                note: 'Error occurred but handled gracefully'
            });
        }
    }

    static async verifyPaymentManually(req, res) {
        try {
            const { checkoutId } = req.params;

            if (!checkoutId) {
                return sendErrorResponse(res, { message: 'Checkout ID is required' }, 400);
            }

            const updatedCheckout = await CheckoutService.verifyPaymentManually(checkoutId);

            sendSuccessResponse(res, {
                message: 'Payment verified successfully.',
                checkout: updatedCheckout,
                paymentDetails: updatedCheckout.paymentDetails
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to verify payment manually.' });
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

    static async getUserCheckouts(req, res) {
        try {
            const userId = req.user.id;
            const checkouts = await CheckoutService.getUserCheckouts(userId);

            sendSuccessResponse(res, {
                message: 'User checkouts retrieved successfully.',
                checkouts,
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to retrieve user checkouts.' });
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
                paymentStatus: checkout.paymentStatus,
                paymentDetails: checkout.paymentDetails || {}
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to retrieve checkout status.' });
        }
    }

    static async updateDeliveryStatus(req, res) {
        try {
            const { checkoutId } = req.params;
            const { deliveryStatus, note } = req.body;

            const updatedCheckout = await CheckoutService.updateDeliveryStatus(checkoutId, deliveryStatus, note);

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

    static async getDeliveredOrders(req, res) {
        try {
            const userId = req.user.id;
            const deliveredOrders = await CheckoutService.getDeliveredOrders(userId);

            sendSuccessResponse(res, {
                message: 'Delivered orders retrieved successfully.',
                deliveredOrders
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to retrieve delivered orders.' });
        }
    }

    static async adminUpdateCheckoutAddress(req, res) {
        try {
            const { checkoutId } = req.params;
            const newAddress = req.body;
            const adminUser = req.user;

            const updatedCheckout = await CheckoutService.adminUpdateCheckoutAddress(checkoutId, newAddress, adminUser);

            sendSuccessResponse(res, {
                message: 'Checkout address updated successfully.',
                checkout: updatedCheckout,
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to update checkout address.' });
        }
    }

    static async recordDeliveryPayment(req, res) {
        try {
            const { checkoutId } = req.params;
            const {
                actualMethod,
                posTerminal,
                transferReference,
                receivedBy,
                notes,
                agentName,
                agentPhone,
                agentId
            } = req.body;

            const paymentData = {
                actualMethod,
                receivedBy,
                notes,
                ...(posTerminal && { posTerminal }),
                ...(transferReference && { transferReference })
            };

            const agentInfo = agentName ? {
                name: agentName,
                phone: agentPhone,
                agentId
            } : null;

            const updatedCheckout = await CheckoutService.recordDeliveryPayment(
                checkoutId,
                paymentData,
                agentInfo
            );

            sendSuccessResponse(res, {
                message: 'Delivery payment recorded successfully.',
                checkout: updatedCheckout,
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to record delivery payment.' });
        }
    }

    static async assignDeliveryAgent(req, res) {
        try {
            const { checkoutId } = req.params;
            const { agentName, agentPhone, agentId } = req.body;

            if (!agentName || !agentPhone) {
                return sendErrorResponse(res, { message: 'Agent name and phone are required' }, 400);
            }

            const agentInfo = {
                name: agentName,
                phone: agentPhone,
                agentId: agentId || null
            };

            const updatedCheckout = await CheckoutService.assignDeliveryAgent(checkoutId, agentInfo);

            sendSuccessResponse(res, {
                message: 'Delivery agent assigned successfully.',
                checkout: updatedCheckout,
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to assign delivery agent.' });
        }
    }

    static async confirmDeliveryPayment(req, res) {
        try {
            const { checkoutId } = req.params;
            const { confirmationNotes } = req.body;
            const adminUserId = req.user.id;

            const updatedCheckout = await CheckoutService.confirmDeliveryPayment(
                checkoutId,
                adminUserId,
                confirmationNotes
            );

            sendSuccessResponse(res, {
                message: 'Delivery payment confirmed successfully.',
                checkout: updatedCheckout,
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to confirm delivery payment.' });
        }
    }

    static async getPendingDeliveryPayments(req, res) {
        try {
            const pendingPayments = await CheckoutService.getPendingDeliveryPayments();

            sendSuccessResponse(res, {
                message: 'Pending delivery payments retrieved successfully.',
                pendingPayments,
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to retrieve pending delivery payments.' });
        }
    }

    static async getEnhancedPaymentStatistics(req, res) {
        try {
            const stats = await CheckoutService.getEnhancedPaymentMethodStatistics();

            sendSuccessResponse(res, {
                message: 'Payment statistics retrieved successfully.',
                stats,
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to retrieve payment statistics.' });
        }
    }

    static async getPaymentDetails(req, res) {
        try {
            const { checkoutId } = req.params;
            const checkout = await CheckoutService.getCheckoutById(checkoutId);

            if (!checkout) {
                return sendErrorResponse(res, { message: 'Checkout not found' }, 404);
            }

            sendSuccessResponse(res, {
                message: 'Payment details retrieved successfully.',
                paymentDetails: {
                    orderNumber: checkout.orderNumber,
                    paymentStatus: checkout.paymentStatus,
                    paymentType: checkout.paymentType,
                    totalAmount: checkout.totalAmount,
                    paymentReference: checkout.paymentReference,
                    paymentDetails: checkout.paymentDetails || {},
                    createdAt: checkout.createdAt,
                    updatedAt: checkout.updatedAt
                }
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to retrieve payment details.' });
        }
    }

    static async checkPendingPayments(req, res) {
        try {
            const results = await CheckoutService.checkPendingPayments();

            sendSuccessResponse(res, {
                message: 'Pending payments checked successfully.',
                results,
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to check pending payments.' });
        }
    }

    static async getPaymentRetryUrl(req, res) {
        try {
            const { checkoutId } = req.params;
            const checkout = await CheckoutService.getCheckoutById(checkoutId);

            if (!checkout) {
                return sendErrorResponse(res, { message: 'Checkout not found' }, 404);
            }

            if (checkout.paymentStatus !== 'failed') {
                return sendErrorResponse(res, { message: 'Only failed payments can be retried' }, 400);
            }

            if (checkout.paymentType !== 'online_payment') {
                return sendErrorResponse(res, { message: 'Only online payments can be retried' }, 400);
            }

            const retryUrl = await CheckoutService.getPaymentRetryUrl(checkoutId);

            if (!retryUrl) {
                return sendErrorResponse(res, { message: 'Failed to generate retry URL' }, 500);
            }

            sendSuccessResponse(res, {
                message: 'Payment retry URL generated successfully.',
                retryUrl,
            });
        } catch (error) {
            sendErrorResponse(res, { message: error.message || 'Failed to generate payment retry URL.' });
        }
    }
}

module.exports = CheckoutController;
