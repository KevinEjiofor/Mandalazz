const CheckoutRepo = require('../data/repositories/CheckoutRepository');
const User = require('../../user/data/models/userModel');
const CartService = require('../../cart/services/CartService');
const { initializePayment } = require('../../utils/paystackHandler');
const { userNotifications } = require('../../utils/emailHandler');
const { getIO } = require('../../utils/socketHandler');
const NotificationService = require('../../notification/service/NotificationService');
const CheckoutStatus = require('../../config/checkoutStatus');

class CheckoutService {
    static validateDetails(userDetails, paymentType) {
        if (!userDetails?.address || !userDetails?.phoneNumber || !userDetails?.email) {
            throw new Error('Complete user details required');
        }
        if (!['payment_on_delivery', 'online_payment'].includes(paymentType)) {
            throw new Error('Invalid payment type');
        }
    }

    static async createCheckout(userId, { userDetails, paymentType }) {
        if (!userId) throw new Error('Only logged-in users can perform checkout');
        this.validateDetails(userDetails, paymentType);

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const cart = await CartService.getCart(userId);
        if (!cart?.items?.length) throw new Error('Cart is empty.');

        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);
        const cancelDays = paymentType === 'online_payment' ? 1 : 2;
        const cancellationDeadline = new Date(Date.now() + cancelDays * 86400000);

        if (paymentType === 'online_payment') {
            return this._processOnlinePayment(user, userDetails, cart, estimatedDelivery, cancellationDeadline);
        }

        // Payment on delivery path
        const payload = {
            user: userId,
            products: cart.items,
            totalAmount: cart.totalAmount,
            userDetails,
            paymentType: 'payment_on_delivery',
            paymentStatus: 'pending',
            deliveryStatus: CheckoutStatus.PENDING,
            estimatedDeliveryDate: estimatedDelivery,
            cancellationDeadline,
            paymentReference: null,
        };

        const checkout = await CheckoutRepo.create(payload);
        await CartService.clearCart(userId);
        this._notifyUserAndAdmin(user, checkout, 'payment on delivery');
        return checkout;
    }

    static async _processOnlinePayment(user, userDetails, cart, estimatedDeliveryDate, cancellationDeadline) {
        const amount = +cart.totalAmount;
        if (isNaN(amount) || amount <= 0) throw new Error('Invalid total amount');

        const reference = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const checkout = await CheckoutRepo.create({
            products: cart.items,
            totalAmount: amount,
            userDetails,
            paymentType: 'online_payment',
            paymentStatus: 'pending',
            paymentReference: reference,
            deliveryStatus: CheckoutStatus.UNDER_PROCESS,
            estimatedDeliveryDate,
            cancellationDeadline,
        });

        const { data: { authorization_url } = {} } = await initializePayment(userDetails.email, amount, { reference });
        if (!authorization_url) throw new Error('Payment initialization failed');

        await CartService.clearCart(user.id);
        this._notifyUserAndAdmin(user, checkout, 'online payment', reference);

        return { checkout, paymentUrl: authorization_url };
    }

    static async handlePaymentWebhook(reference, { status }) {
        const checkout = await CheckoutRepo.findByReference(reference);
        if (!checkout) throw new Error('Checkout not found');

        const newStatus = status === 'success' ? 'paid' : 'failed';
        const updated = await CheckoutRepo.updateStatus(checkout._id, { paymentStatus: newStatus });
        const user = await User.findById(updated.user).catch(() => null);

        this._notifyUserAndAdmin(user, updated, 'payment status update');
        if (updated.paymentStatus === 'paid') {
            await userNotifications(updated.userDetails.email, 'Payment Successful', 'Your payment has been confirmed. Delivery within 3–7 days.');
        }

        return updated;
    }

    static async updatePaymentStatus(checkoutId, paymentStatus) {
        if (!['paid','failed'].includes(paymentStatus)) throw new Error('Invalid payment status');
        const existing = await CheckoutRepo.findById(checkoutId);
        if (!existing) throw new Error('Checkout not found');
        if (existing.paymentType !== 'payment_on_delivery') throw new Error('Not POD type');
        if (existing.paymentStatus === 'paid') throw new Error('Already paid');

        const updated = await CheckoutRepo.updateStatus(checkoutId, { paymentStatus });
        const user = await User.findById(updated.user);
        this._notifyUserAndAdmin(user, updated, 'payment status update');
        return updated;
    }

    static async updateDeliveryStatus(checkoutId, newDeliveryStatus) {
        const validStatuses = Object.values(CheckoutStatus);
        if (!validStatuses.includes(newDeliveryStatus)) throw new Error('Invalid delivery status');

        const updated = await CheckoutRepo.updateStatus(checkoutId, { deliveryStatus: newDeliveryStatus });
        const user = await User.findById(updated.user);
        await userNotifications(updated.userDetails.email, 'Delivery Status Update', `Your delivery status is now: ${newDeliveryStatus}`);
        this._notifyUserAndAdmin(user, updated, 'delivery status update');
        return updated;
    }

    static async cancelCheckout(checkoutId) {
        const checkout = await CheckoutRepo.findById(checkoutId);
        if (!checkout) throw new Error('Checkout not found');
        if (new Date() > new Date(checkout.cancellationDeadline)) throw new Error('Cancellation deadline passed');
        if (checkout.paymentStatus === 'paid') throw new Error('Cannot cancel a paid checkout');

        await CheckoutRepo.deleteById(checkoutId);
        const user = await User.findById(checkout.user);
        this._notifyUserAndAdmin(user, checkout, 'checkout cancelled');
        return checkout;
    }

    static getCheckoutById(id) {
        return CheckoutRepo.findById(id);
    }

    static getCheckouts() {
        return CheckoutRepo.find();
    }

    static searchCheckouts(params) {
        const query = {};
        if (params.email) query['userDetails.email'] = { $regex: params.email, $options: 'i' };
        if (params.paymentStatus) query.paymentStatus = params.paymentStatus;
        if (params.paymentReference) query.paymentReference = params.paymentReference;
        if (params.deliveryStatus) query.deliveryStatus = params.deliveryStatus;
        return CheckoutRepo.find(query);
    }

    static _notifyUserAndAdmin(user, checkout, eventType, reference = null) {

        const socket = getIO();
        const msg = `${user.firstName} ${user.lastName} ${eventType.replace(/_/g,' ')} for checkout ${checkout._id}`;
        const payload = {
            checkoutId: checkout._id,
            firstName: user.firstName,
            lastName: user.lastName,
            paymentType: checkout.paymentType,
            paymentStatus: checkout.paymentStatus,
            deliveryStatus: checkout.deliveryStatus,
            totalAmount: checkout.totalAmount,
            ...(reference && { paymentReference: reference }),
        };

        if (socket) socket.to('adminRoom').emit('adminNotification', {
            type: eventType,
            message: msg,
            data: payload,
        });

        NotificationService.addNotification(eventType, msg, payload);
    }
}

module.exports = CheckoutService;
