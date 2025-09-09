const CheckoutRepo = require('../../checkout/data/repositories/CheckoutRepository');
const CartService = require('../../cart/services/CartService');
const { initializePayment, verifyPayment } = require('../paystackHandler');
const { generateOrderNumber } = require('../tokenGenerator');
const CheckoutNotifier = require('./CheckoutNotifier');
const CheckoutStatus = require('../../enums/checkoutStatus');

const logger = {
    info: (message, data = null) => {},
    error: (message, error = null) => {},
    warn: (message, data = null) => {},
    debug: (message, data = null) => {}
};

class PaymentProcessor {
    static async processPaymentOnDelivery(user, addressDetails, cart, estimatedDelivery, cancellationDeadline, deliveryStatusTimeline) {
        try {
            logger.info('Processing payment on delivery', { userId: user._id });

            const payload = {
                user: user._id,
                orderNumber: generateOrderNumber(),
                products: cart.items,
                totalAmount: cart.totalAmount,
                userDetails: addressDetails,
                paymentType: 'payment_on_delivery',
                paymentStatus: 'pending',
                deliveryStatus: CheckoutStatus.PENDING,
                estimatedDeliveryDate: estimatedDelivery,
                cancellationDeadline,
                deliveryStatusTimeline
            };

            const checkout = await CheckoutRepo.create(payload);
            const secureCheckout = await CheckoutRepo.findByIdSecure(checkout._id);

            await CartService.clearCart(user._id);
            CheckoutNotifier.notifyUserAndAdmin(user, secureCheckout, 'payment_on_delivery');

            logger.info('Payment on delivery processed successfully', { orderNumber: secureCheckout.orderNumber });
            return secureCheckout;

        } catch (error) {
            logger.error('Failed to process payment on delivery', error);
            throw error;
        }
    }

    static async processOnlinePayment(user, addressDetails, cart, estimatedDeliveryDate, cancellationDeadline, deliveryStatusTimeline) {
        try {
            logger.info('Processing online payment', { userId: user._id, email: addressDetails.email });

            const amount = +cart.totalAmount;
            if (isNaN(amount) || amount <= 0) throw new Error('Invalid total amount');

            const reference = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

            const checkout = await CheckoutRepo.create({
                user: user._id,
                orderNumber: generateOrderNumber(),
                products: cart.items,
                totalAmount: amount,
                userDetails: addressDetails,
                paymentType: 'online_payment',
                paymentStatus: 'pending',
                paymentReference: reference,
                deliveryStatus: CheckoutStatus.UNDER_PROCESS,
                estimatedDeliveryDate,
                cancellationDeadline,
                deliveryStatusTimeline
            });

            logger.debug('Checkout created, initializing payment with Paystack', { reference });

            const { data: { authorization_url } = {} } = await initializePayment(
                addressDetails.email,
                amount,
                {
                    reference,
                    metadata: {
                        checkout_id: checkout._id.toString(),
                        order_number: checkout.orderNumber,
                        user_id: user._id.toString()
                    }
                }
            );

            if (!authorization_url) throw new Error('Payment initialization failed');

            const secureCheckout = await CheckoutRepo.findByIdSecure(checkout._id);

            await CartService.clearCart(user._id);
            CheckoutNotifier.notifyUserAndAdmin(user, secureCheckout, 'online_payment', reference);

            logger.info('Online payment initialized successfully', {
                orderNumber: secureCheckout.orderNumber,
                reference,
                paymentUrl: authorization_url
            });

            return { checkout: secureCheckout, paymentUrl: authorization_url };

        } catch (error) {
            logger.error('Failed to process online payment', error);
            throw error;
        }
    }

    static async handlePaymentWebhook(reference, webhookData) {
        logger.info('Processing payment webhook', { reference, event: webhookData.event });

        let checkout = await CheckoutRepo.findByReferenceSecure(reference);

        if (!checkout && webhookData.metadata) {
            logger.debug('Checkout not found by reference, trying metadata', { reference });

            if (webhookData.metadata.checkout_id) {
                checkout = await CheckoutRepo.findByIdSecure(webhookData.metadata.checkout_id);
            }

            if (!checkout && webhookData.metadata.order_number) {
                checkout = await this._findCheckoutByOrderNumber(webhookData.metadata.order_number);
            }
        }

        if (!checkout) {
            logger.error('Checkout not found for webhook', { reference });
            throw new Error('Checkout not found');
        }

        if (checkout.paymentStatus === 'paid') {
            logger.info('Payment already processed', { orderNumber: checkout.orderNumber });
            return checkout;
        }

        try {
            logger.debug('Verifying payment with Paystack', { reference });

            const verifyResponse = await verifyPayment(reference);
            const transaction = verifyResponse.data;

            if (!transaction || transaction.status !== 'success') {
                logger.warn('Payment verification failed', {
                    status: transaction?.status,
                    response: transaction?.gateway_response
                });

                await this._handleFailedPayment(checkout, transaction);
                throw new Error(`Payment verification failed: ${transaction?.gateway_response || 'Unknown error'}`);
            }

            const paymentDetails = this._extractPaymentDetails(transaction, reference);
            logger.debug('Payment details extracted', { paymentDetails });

            const updatedCheckout = await CheckoutRepo.updateStatusSecure(
                checkout._id,
                {
                    paymentStatus: 'paid',
                    paymentDetails,
                    actualDeliveryDate: transaction.paid_at ? new Date(transaction.paid_at) : new Date(),
                    deliveryStatus: CheckoutStatus.UNDER_PROCESS
                }
            );

            await this._sendPaymentSuccessNotifications(updatedCheckout);
            CheckoutNotifier.notifyUserAndAdmin(updatedCheckout.user, updatedCheckout, 'payment_verified');

            logger.info('Payment processed successfully via webhook', {
                orderNumber: updatedCheckout.orderNumber,
                reference
            });

            return updatedCheckout;

        } catch (error) {
            logger.error('Error processing payment webhook', error);

            if (checkout.paymentStatus !== 'failed') {
                await CheckoutRepo.updateStatusSecure(checkout._id, {
                    paymentStatus: 'failed',
                    paymentDetails: {
                        method: 'failed',
                        channel: 'unknown',
                        failure_reason: error.message,
                        failed_at: new Date(),
                        reference: reference
                    }
                });
            }
            throw error;
        }
    }

    static _extractPaymentDetails(transaction, originalReference = null) {
        const reference = transaction.reference || originalReference || 'unknown';

        const baseDetails = {
            method: this._normalizePaymentMethod(transaction.channel),
            channel: transaction.channel,
            gateway_response: transaction.gateway_response,
            reference: reference,
            amount: transaction.amount / 100,
            currency: transaction.currency,
            paid_at: transaction.paid_at,
            fees: transaction.fees ? transaction.fees / 100 : null,
            customer_code: transaction.customer?.customer_code,
            authorization_code: transaction.authorization?.authorization_code,
        };

        switch (transaction.channel) {
            case 'card':
                return {
                    ...baseDetails,
                    cardType: transaction.authorization?.card_type,
                    last4: transaction.authorization?.last4,
                    exp_month: transaction.authorization?.exp_month,
                    exp_year: transaction.authorization?.exp_year,
                    bank: transaction.authorization?.bank,
                    brand: transaction.authorization?.brand,
                    countryCode: transaction.authorization?.country_code,
                    authorizationCode: transaction.authorization?.authorization_code,
                    bin: transaction.authorization?.bin,
                    reusable: transaction.authorization?.reusable,
                    signature: transaction.authorization?.signature,
                    account_name: transaction.authorization?.account_name
                };
            case 'bank':
            case 'dedicated_nuban':
                return {
                    ...baseDetails,
                    account_name: transaction.authorization?.account_name,
                    account_number: transaction.authorization?.account_number,
                    bank_code: transaction.authorization?.bank_code,
                    bank_name: transaction.authorization?.bank
                };
            case 'ussd':
                return {
                    ...baseDetails,
                    ussd_code: transaction.metadata?.ussd_code,
                    bank_name: transaction.authorization?.bank
                };
            case 'qr':
                return {
                    ...baseDetails,
                    provider: transaction.metadata?.provider || 'QR Code'
                };
            case 'mobile_money':
                return {
                    ...baseDetails,
                    phone_number: transaction.authorization?.phone_number,
                    provider: transaction.authorization?.provider
                };
            case 'eft':
                return {
                    ...baseDetails,
                    bank_name: transaction.authorization?.bank,
                    account_name: transaction.authorization?.account_name
                };
            case 'bank_transfer':
                return {
                    ...baseDetails,
                    account_name: transaction.authorization?.account_name,
                    account_number: transaction.authorization?.account_number,
                    bank_name: transaction.authorization?.bank,
                    session_id: transaction.metadata?.session_id
                };
            default:
                return baseDetails;
        }
    }

    static _normalizePaymentMethod(channel) {
        const methodMap = {
            'card': 'card',
            'bank': 'bank_transfer',
            'dedicated_nuban': 'bank_transfer',
            'ussd': 'ussd',
            'qr': 'qr',
            'mobile_money': 'mobile_money',
            'eft': 'eft',
            'bank_transfer': 'bank_transfer'
        };
        return methodMap[channel] || channel;
    }

    static async _handleFailedPayment(checkout, transaction) {
        try {
            const { userNotifications } = require('../emailHandler');
            const failureReason = transaction?.gateway_response || 'Payment verification failed';

            await CheckoutRepo.updateStatusSecure(checkout._id, {
                paymentStatus: 'failed',
                paymentDetails: {
                    method: 'failed',
                    channel: transaction?.channel || 'unknown',
                    failure_reason: failureReason,
                    failed_at: new Date(),
                    reference: checkout.paymentReference
                }
            });

            await userNotifications(
                checkout.userDetails.email,
                'Payment Failed',
                `Dear ${checkout.userDetails.firstName}, your payment for order ${checkout.orderNumber} was unsuccessful. Reason: ${failureReason}. Please try again or contact support.`
            );

            logger.info('Failed payment handled', { orderNumber: checkout.orderNumber });
        } catch (error) {
            logger.error('Error handling failed payment', error);
            throw error;
        }
    }

    static async _sendPaymentSuccessNotifications(checkout) {
        try {
            const { userNotifications } = require('../emailHandler');
            const paymentMethodText = this._getPaymentMethodDisplayText(checkout.paymentDetails);

            const paymentReference = checkout.paymentDetails?.reference ||
                checkout.paymentReference ||
                'Not available';

            const currency = checkout.paymentDetails?.currency || 'NGN';

            await userNotifications(
                checkout.userDetails.email,
                'Payment Successful',
                `Dear ${checkout.userDetails.firstName}, \n\nYour payment for order ${checkout.orderNumber} has been confirmed successfully!\n\nPayment Details:\n- Method: ${paymentMethodText}\n- Amount: ${currency} ${checkout.totalAmount}\n- Reference: ${paymentReference}\n\nYour order will be delivered within 3–7 days to ${checkout.userDetails.address}.\n\nThank you for choosing us!`
            );

            logger.info('Payment success notification sent', { orderNumber: checkout.orderNumber });
        } catch (error) {
            logger.error('Error sending payment success notification', error);
        }
    }

    static _getPaymentMethodDisplayText(paymentDetails) {
        if (!paymentDetails || !paymentDetails.method) return 'Online Payment';

        switch (paymentDetails.method) {
            case 'card':
                return `${paymentDetails.brand || 'Card'} ending in ${paymentDetails.last4 || '****'}`;
            case 'bank_transfer':
                return `Bank Transfer (${paymentDetails.bank_name || 'Bank'})`;
            case 'ussd':
                return `USSD (${paymentDetails.bank_name || 'Bank'})`;
            case 'mobile_money':
                return `Mobile Money (${paymentDetails.provider || 'Provider'})`;
            case 'qr':
                return 'QR Code Payment';
            case 'eft':
                return 'Electronic Funds Transfer';
            default:
                return 'Online Payment';
        }
    }

    static async verifyPaymentWithRetry(reference, maxRetries = 3, delay = 2000) {
        let retries = 0;

        logger.debug('Starting payment verification with retry', { reference, maxRetries });

        while (retries < maxRetries) {
            try {
                const verifyResponse = await verifyPayment(reference);
                const transaction = verifyResponse.data;

                if (transaction && transaction.status === 'success') {
                    logger.debug('Payment verification successful', { reference, attempt: retries + 1 });
                    return transaction;
                }

                if (retries < maxRetries - 1) {
                    logger.debug('Payment not successful, waiting before retry', {
                        reference,
                        attempt: retries + 1,
                        delay,
                        status: transaction?.status
                    });

                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                }

                retries++;
            } catch (error) {
                logger.error(`Payment verification attempt ${retries + 1} failed`, error);

                if (retries >= maxRetries - 1) throw error;

                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
                retries++;
            }
        }

        throw new Error('Payment verification failed after retries');
    }

    static async verifyPaymentManually(checkoutId) {
        try {
            logger.info('Manual payment verification requested', { checkoutId });

            const checkout = await CheckoutRepo.findByIdSecure(checkoutId);
            if (!checkout) throw new Error('Checkout not found');
            if (!checkout.paymentReference) throw new Error('No payment reference found');
            if (checkout.paymentStatus === 'paid') throw new Error('Payment is already verified');

            const transaction = await this.verifyPaymentWithRetry(checkout.paymentReference);
            const paymentDetails = this._extractPaymentDetails(transaction, checkout.paymentReference);

            const updatedCheckout = await CheckoutRepo.updateStatusSecure(
                checkout._id,
                {
                    paymentStatus: 'paid',
                    paymentDetails,
                    actualDeliveryDate: transaction.paid_at ? new Date(transaction.paid_at) : new Date(),
                    deliveryStatus: CheckoutStatus.UNDER_PROCESS
                }
            );

            await this._sendPaymentSuccessNotifications(updatedCheckout);
            CheckoutNotifier.notifyUserAndAdmin(updatedCheckout.user, updatedCheckout, 'payment_manually_verified');

            logger.info('Manual payment verification successful', { orderNumber: updatedCheckout.orderNumber });
            return updatedCheckout;

        } catch (error) {
            logger.error('Manual payment verification failed', error);

            const checkout = await CheckoutRepo.findByIdSecure(checkoutId);
            if (checkout && checkout.paymentStatus !== 'failed') {
                await CheckoutRepo.updateStatusSecure(checkoutId, {
                    paymentStatus: 'failed',
                    paymentDetails: {
                        method: 'failed',
                        channel: 'unknown',
                        failure_reason: error.message,
                        failed_at: new Date(),
                        reference: checkout.paymentReference
                    }
                });
            }

            throw new Error(`Payment verification failed: ${error.message}`);
        }
    }

    static async _findCheckoutByOrderNumber(orderNumber) {
        const checkouts = await CheckoutRepo.findSecure({ orderNumber });
        return checkouts.length > 0 ? checkouts[0] : null;
    }
}

module.exports = PaymentProcessor;
