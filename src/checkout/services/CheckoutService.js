const CheckoutRepo = require('../data/repositories/CheckoutRepository');
const User = require('../../user/data/models/userModel');
const CartService = require('../../cart/services/CartService');
const AddressService = require('../../address/services/AddressService');
const { initializePayment } = require('../../utils/paystackHandler');
const { userNotifications } = require('../../utils/emailHandler');
const { getIO } = require('../../utils/socketHandler');
const NotificationService = require('../../notification/service/NotificationService');
const CheckoutStatus = require('../../config/checkoutStatus');

class CheckoutService {
    static validateCheckoutRequest(userDetails, paymentType) {
        if (!['payment_on_delivery', 'online_payment'].includes(paymentType)) {
            throw new Error('Invalid payment type');
        }

        if (userDetails.addressId) {
            if (!userDetails.addressId.match(/^[0-9a-fA-F]{24}$/)) {
                throw new Error('Invalid address ID format');
            }
            return;
        }

        const requiredFields = ['firstName', 'lastName', 'address', 'phoneNumber', 'email'];
        for (const field of requiredFields) {
            if (!userDetails[field]) {
                throw new Error(`${field} is required`);
            }
        }

        if (userDetails.location) {
            const { lat, lng } = userDetails.location;
            if ((lat !== undefined && isNaN(lat)) || (lng !== undefined && isNaN(lng))) {
                throw new Error('Invalid location coordinates');
            }
        }
    }

    static async getOrCreateAddressDetails(userDetails, userId) {
        if (userDetails.addressId) {
            const address = await AddressService.getAddressById(userDetails.addressId, userId);
            if (!address) throw new Error('Selected address not found');

            const {
                firstName, lastName, address: addr, landmark,
                phoneNumber, email, location,
                country, city, state, postalCode
            } = address;

            return {
                firstName, lastName, address: addr, landmark,
                phoneNumber, email, location, country, city, state, postalCode
            };
        }

        return await AddressService.createAddress(userId, userDetails);
    }

    static calculateDeliveryDates(paymentType) {
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

        const cancelDays = paymentType === 'online_payment' ? 1 : 2;
        const cancellationDeadline = new Date(Date.now() + cancelDays * 86400000);

        return { estimatedDelivery, cancellationDeadline };
    }

    static async createCheckout(userId, { userDetails, paymentType }) {
        if (!userId) throw new Error('Only logged-in users can perform checkout');

        this.validateCheckoutRequest(userDetails, paymentType);

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const cart = await CartService.getCart(userId);
        if (!cart?.items?.length) throw new Error('Cart is empty.');

        const addressDetails = await this.getOrCreateAddressDetails(userDetails, userId);
        const { estimatedDelivery, cancellationDeadline } = this.calculateDeliveryDates(paymentType);

        if (paymentType === 'online_payment') {
            return this._processOnlinePayment(user, addressDetails, cart, estimatedDelivery, cancellationDeadline);
        }

        return this._processPaymentOnDelivery(user, addressDetails, cart, estimatedDelivery, cancellationDeadline);
    }

    static async _processPaymentOnDelivery(user, addressDetails, cart, estimatedDelivery, cancellationDeadline) {
        const payload = {
            user: user._id,
            products: cart.items,
            totalAmount: cart.totalAmount,
            userDetails: addressDetails,
            paymentType: 'payment_on_delivery',
            paymentStatus: 'pending',
            deliveryStatus: CheckoutStatus.PENDING,
            estimatedDeliveryDate: estimatedDelivery,
            cancellationDeadline,
            // paymentReference: null,
        };

        const checkout = await CheckoutRepo.create(payload);
        await CartService.clearCart(user._id);
        this._notifyUserAndAdmin(user, checkout, 'payment_on_delivery');

        return checkout;
    }

    static async _processOnlinePayment(user, addressDetails, cart, estimatedDeliveryDate, cancellationDeadline) {
        const amount = +cart.totalAmount;
        if (isNaN(amount) || amount <= 0) throw new Error('Invalid total amount');

        const reference = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        const checkout = await CheckoutRepo.create({
            user: user._id,
            products: cart.items,
            totalAmount: amount,
            userDetails: addressDetails,
            paymentType: 'online_payment',
            paymentStatus: 'pending',
            paymentReference: reference,
            deliveryStatus: CheckoutStatus.UNDER_PROCESS,
            estimatedDeliveryDate,
            cancellationDeadline,
        });

        const { data: { authorization_url } = {} } = await initializePayment(addressDetails.email, amount, { reference });
        if (!authorization_url) throw new Error('Payment initialization failed');

        await CartService.clearCart(user._id);
        this._notifyUserAndAdmin(user, checkout, 'online_payment', reference);

        return { checkout, paymentUrl: authorization_url };
    }

    static async handlePaymentWebhook(reference, { status }) {
        const checkout = await CheckoutRepo.findByReference(reference);
        if (!checkout) throw new Error('Checkout not found');

        const newStatus = status === 'success' ? 'paid' : 'failed';
        const updated = await CheckoutRepo.updateStatus(checkout._id, { paymentStatus: newStatus });
        const user = await User.findById(updated.user).catch(() => null);

        this._notifyUserAndAdmin(user, updated, 'payment_status_update');

        if (updated.paymentStatus === 'paid') {
            await userNotifications(
                updated.userDetails.email,
                'Payment Successful',
                `Dear ${updated.userDetails.firstName}, your payment has been confirmed. Delivery within 3–7 days to ${updated.userDetails.address}.`
            );
        }

        return updated;
    }

    static async updatePaymentStatus(checkoutId, paymentStatus) {
        if (!['paid', 'failed'].includes(paymentStatus)) {
            throw new Error('Invalid payment status');
        }

        const existing = await CheckoutRepo.findById(checkoutId);
        if (!existing) throw new Error('Checkout not found');

        if (existing.paymentType !== 'payment_on_delivery') {
            throw new Error('Payment status can only be updated for payment on delivery orders');
        }

        if (existing.paymentStatus === 'paid') {
            throw new Error('Order is already paid');
        }

        const updated = await CheckoutRepo.updateStatus(checkoutId, { paymentStatus });
        const user = await User.findById(updated.user);
        this._notifyUserAndAdmin(user, updated, 'payment_status_update');

        return updated;
    }

    static async updateDeliveryStatus(checkoutId, newDeliveryStatus) {
        const validStatuses = Object.values(CheckoutStatus);
        if (!validStatuses.includes(newDeliveryStatus)) {
            throw new Error('Invalid delivery status');
        }

        const updated = await CheckoutRepo.updateStatus(checkoutId, { deliveryStatus: newDeliveryStatus });
        const user = await User.findById(updated.user);

        await userNotifications(
            updated.userDetails.email,
            'Delivery Status Update',
            `Dear ${updated.userDetails.firstName}, your delivery status is now: ${newDeliveryStatus}`
        );

        this._notifyUserAndAdmin(user, updated, 'delivery_status_update');
        return updated;
    }

    static async cancelCheckout(checkoutId) {
        const checkout = await CheckoutRepo.findById(checkoutId);
        if (!checkout) throw new Error('Checkout not found');

        if (new Date() > new Date(checkout.cancellationDeadline)) {
            throw new Error('Cancellation deadline has passed');
        }

        if (checkout.paymentStatus === 'paid') {
            throw new Error('Cannot cancel a paid checkout');
        }

        await CheckoutRepo.deleteById(checkoutId);
        const user = await User.findById(checkout.user);
        this._notifyUserAndAdmin(user, checkout, 'checkout_cancelled');

        return checkout;
    }

    static getCheckoutById(id) {
        return CheckoutRepo.findById(id);
    }

    static getCheckouts() {
        return CheckoutRepo.find();
    }

    static getUserCheckouts(userId) {
        return CheckoutRepo.find({ user: userId });
    }

    static searchCheckouts(params) {
        const query = {};

        if (params.email) query['userDetails.email'] = { $regex: params.email, $options: 'i' };
        if (params.firstName) query['userDetails.firstName'] = { $regex: params.firstName, $options: 'i' };
        if (params.lastName) query['userDetails.lastName'] = { $regex: params.lastName, $options: 'i' };
        if (params.paymentStatus) query.paymentStatus = params.paymentStatus;
        if (params.paymentReference) query.paymentReference = params.paymentReference;
        if (params.deliveryStatus) query.deliveryStatus = params.deliveryStatus;
        if (params.country) query['userDetails.country.name'] = { $regex: params.country, $options: 'i' };
        if (params.city) query['userDetails.city'] = { $regex: params.city, $options: 'i' };

        return CheckoutRepo.find(query);
    }

    static async getLocationStatistics() {
        const checkouts = await CheckoutRepo.find();
        const locationStats = {};

        checkouts.forEach(checkout => {
            const country = checkout.userDetails?.country?.name || 'Unknown';
            const city = checkout.userDetails?.city || 'Unknown';
            const key = `${country}-${city}`;

            if (!locationStats[key]) {
                locationStats[key] = {
                    country,
                    city,
                    totalOrders: 0,
                    totalAmount: 0,
                    paidOrders: 0,
                    pendingOrders: 0
                };
            }

            locationStats[key].totalOrders++;
            locationStats[key].totalAmount += parseFloat(checkout.totalAmount.toString());

            if (checkout.paymentStatus === 'paid') {
                locationStats[key].paidOrders++;
            } else if (checkout.paymentStatus === 'pending') {
                locationStats[key].pendingOrders++;
            }
        });

        return Object.values(locationStats);
    }

    static _notifyUserAndAdmin(user, checkout, eventType, reference = null) {
        const socket = getIO();
        const customerName = checkout.userDetails
            ? `${checkout.userDetails.firstName} ${checkout.userDetails.lastName}`
            : `${user.firstName} ${user.lastName}`;

        const message = `${customerName} - ${eventType.replace(/_/g, ' ')} - Checkout ${checkout._id}`;

        const payload = {
            checkoutId: checkout._id,
            userId: user._id,
            customerName,
            firstName: checkout.userDetails?.firstName || user.firstName,
            lastName: checkout.userDetails?.lastName || user.lastName,
            email: checkout.userDetails?.email || user.email,
            address: checkout.userDetails?.address,
            country: checkout.userDetails?.country?.name,
            city: checkout.userDetails?.city,
            paymentType: checkout.paymentType,
            paymentStatus: checkout.paymentStatus,
            deliveryStatus: checkout.deliveryStatus,
            totalAmount: checkout.totalAmount,
            ...(reference && { paymentReference: reference }),
        };

        if (socket) {
            socket.to('adminRoom').emit('adminNotification', {
                type: eventType,
                message,
                data: payload
            });
        }

        NotificationService.addNotification(eventType, message, payload);
    }
}

module.exports = CheckoutService;
