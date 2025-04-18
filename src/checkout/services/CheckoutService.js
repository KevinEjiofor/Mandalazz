const Checkout = require('../data/models/checkoutModel');
const User = require('../../user/data/models/userModel');
const { initializePayment } = require('../../utils/paystackHandler');
const CartService = require('../../cart/services/CartService');
const { userNotifications } = require('../../utils/emailHandler');
const { getIO } = require('../../utils/socketHandler');
const CheckoutStatus = require('../../config/checkoutStatus');
const NotificationService = require('../../notification/service/NotificationService');

class CheckoutService {
    static async createCheckout(userId, checkoutDetails) {
        if (!userId) {
            throw new Error('Only logged-in users can perform checkout');
        }

        // Get user information to include in notifications
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const { userDetails, paymentType } = checkoutDetails;
        this.validateCheckoutDetails(userDetails, paymentType);

        const cart = await CartService.getCart(userId);
        if (!cart || cart.items.length === 0) {
            throw new Error('Cart is empty. Add items to the cart before checkout.');
        }

        const estimatedDeliveryDate = new Date();
        estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7);

        let cancellationDeadline = new Date();
        cancellationDeadline.setDate(cancellationDeadline.getDate() + (paymentType === 'online_payment' ? 1 : 2));

        if (paymentType === 'online_payment') {
            return this.handleOnlinePayment(userDetails, cart.totalAmount, cart.items, userId, estimatedDeliveryDate, cancellationDeadline, user);
        }

        const newCheckout = new Checkout({
            user: userId,
            products: cart.items,
            totalAmount: cart.totalAmount,
            userDetails,
            paymentReference: null,
            paymentType: 'payment_on_delivery',
            paymentStatus: 'pending',
            deliveryStatus: CheckoutStatus.PENDING,
            estimatedDeliveryDate,
            cancellationDeadline,
        });

        await newCheckout.save();
        await CartService.clearCart(userId);

        await userNotifications(
            userDetails.email,
            'Checkout Successful',
            'Your checkout has been processed successfully. Your product will be delivered within 3 to 7 working days.'
        );

        const socket = getIO();
        if (socket) {
            socket.to('adminRoom').emit('adminNotification', {
                type: 'checkout_created',
                message: `${user.firstName} ${user.lastName} created a new checkout with payment on delivery`,
                data: {
                    checkoutId: newCheckout._id,
                    userId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    paymentType: newCheckout.paymentType,
                    paymentStatus: newCheckout.paymentStatus,
                    totalAmount: newCheckout.totalAmount
                },
            });
        } else {
            console.error('WebSocket not available. Skipping emit.');
        }

        // Create persistent notification
        await NotificationService.addNotification(
            'checkout_created',
            `${user.firstName} ${user.lastName} created a new checkout with payment on delivery`,
            {
                checkoutId: newCheckout._id,
                // userId,
                firstName: user.firstName,
                lastName: user.lastName,
                paymentType: newCheckout.paymentType,
                paymentStatus: newCheckout.paymentStatus,
                totalAmount: newCheckout.totalAmount
            }
        );

        return newCheckout;
    }

    static async handleOnlinePayment(userDetails, totalAmount, products, userId, estimatedDeliveryDate, cancellationDeadline, user) {
        const amount = parseFloat(totalAmount.toString());
        if (isNaN(amount) || amount <= 0) {
            throw new Error('Invalid total amount. Please check your cart.');
        }

        const paymentReference = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

        const newCheckout = new Checkout({
            // user: userId,
            products,
            totalAmount: amount,
            userDetails,
            paymentType: 'online_payment',
            paymentStatus: 'pending',
            paymentReference,
            deliveryStatus: CheckoutStatus.UNDER_PROCESS,
            estimatedDeliveryDate,
            cancellationDeadline,
        });

        await newCheckout.save();

        const paymentResponse = await initializePayment(userDetails.email, amount, {
            reference: paymentReference,
        });

        if (!paymentResponse || !paymentResponse.data.authorization_url) {
            throw new Error('Failed to initialize payment');
        }

        await CartService.clearCart(userId);

        const socket = getIO();
        if (socket) {
            socket.to('adminRoom').emit('adminNotification', {
                type: 'checkout_created',
                message: `${user.firstName} ${user.lastName} created a new checkout with online payment`,
                data: {
                    checkoutId: newCheckout._id,
                    // userId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    paymentType: newCheckout.paymentType,
                    paymentStatus: newCheckout.paymentStatus,
                    totalAmount: newCheckout.totalAmount,
                    paymentReference
                },
            });
        }

        // Create persistent notification
        await NotificationService.addNotification(
            'checkout_created',
            `${user.firstName} ${user.lastName} created a new checkout with online payment`,
            {
                checkoutId: newCheckout._id,
                // userId,
                firstName: user.firstName,
                lastName: user.lastName,
                paymentType: newCheckout.paymentType,
                paymentStatus: newCheckout.paymentStatus,
                totalAmount: newCheckout.totalAmount,
                paymentReference
            }
        );

        return { checkout: newCheckout, paymentUrl: paymentResponse.data.authorization_url };
    }

    static async handlePaymentWebhook(reference, eventData) {
        const checkout = await Checkout.findOne({ paymentReference: reference });
        if (!checkout) {
            console.error(`Checkout not found for reference: ${reference}`);
            throw new Error('Checkout not found');
        }

        checkout.paymentStatus = eventData.status === 'success' ? 'paid' : 'failed';
        await checkout.save();

        // Find the user to include their name in notifications
        const user = await User.findById(checkout.user);
        if (!user) {
            console.error(`User not found for checkout: ${checkout._id}`);
        }

        const firstName = user ? user.firstName : 'Unknown';
        const lastName = user ? user.lastName : 'User';

        const socket = getIO();
        if (socket) {
            socket.to('adminRoom').emit('adminNotification', {
                type: 'payment_status_update',
                message: `${firstName} ${lastName}'s payment for checkout ${checkout._id} has been ${checkout.paymentStatus}`,
                data: {
                    checkoutId: checkout._id,
                    userId: checkout.user,
                    firstName,
                    lastName,
                    paymentType: checkout.paymentType,
                    paymentStatus: checkout.paymentStatus,
                    totalAmount: checkout.totalAmount,
                    paymentReference: checkout.paymentReference
                },
            });
        } else {
            console.error('WebSocket not available. Skipping emit.');
        }

        // Create persistent notification
        await NotificationService.addNotification(
            'payment_status_update',
            `${firstName} ${lastName}'s payment for checkout ${checkout._id} has been ${checkout.paymentStatus}`,
            {
                checkoutId: checkout._id,
                userId: checkout.user,
                firstName,
                lastName,
                paymentType: checkout.paymentType,
                paymentStatus: checkout.paymentStatus,
                totalAmount: checkout.totalAmount,
                paymentReference: checkout.paymentReference
            }
        );

        if (checkout.paymentStatus === 'paid') {
            await userNotifications(
                checkout.userDetails.email,
                'Payment Successful',
                'Your payment has been confirmed. Your product will be delivered within 3 to 7 working days.'
            );
        }
    }

    static validateCheckoutDetails(userDetails, paymentType) {
        if (!userDetails || !userDetails.address || !userDetails.phoneNumber || !userDetails.email) {
            throw new Error('User details including address, phone number, and email are required');
        }
        if (!['payment_on_delivery', 'online_payment'].includes(paymentType)) {
            throw new Error('Invalid payment type');
        }
    }

    static async updatePaymentStatus(checkoutId, paymentStatus) {
        if (!['paid', 'failed'].includes(paymentStatus)) {
            throw new Error('Invalid payment status');
        }

        const checkout = await Checkout.findById(checkoutId);
        if (!checkout) {
            throw new Error('Checkout not found');
        }

        if (checkout.paymentType !== 'payment_on_delivery') {
            throw new Error('This order is not Payment on Delivery');
        }

        if (checkout.paymentStatus === 'paid') {
            throw new Error('Payment already confirmed');
        }

        // Find the user to include their name in notifications
        const user = await User.findById(checkout.user);
        if (!user) {
            throw new Error('User not found');
        }

        checkout.paymentStatus = paymentStatus;
        await checkout.save();

        const socket = getIO();
        if (socket) {
            socket.to('adminRoom').emit('adminNotification', {
                type: 'payment_status_update',
                message: `${user.firstName} ${user.lastName}'s payment for checkout ${checkout._id} has been ${checkout.paymentStatus}`,
                data: {
                    checkoutId: checkout._id,
                    // userId: checkout.user,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    paymentType: checkout.paymentType,
                    paymentStatus: checkout.paymentStatus,
                    totalAmount: checkout.totalAmount
                },
            });
        }

        // Create persistent notification
        await NotificationService.addNotification(
            'payment_status_update',
            `${user.firstName} ${user.lastName}'s payment for checkout ${checkout._id} has been ${checkout.paymentStatus}`,
            {
                checkoutId: checkout._id,
                // userId: checkout.user,
                firstName: user.firstName,
                lastName: user.lastName,
                paymentType: checkout.paymentType,
                paymentStatus: checkout.paymentStatus,
                totalAmount: checkout.totalAmount
            }
        );

        return checkout;
    }

    static async updateDeliveryStatus(checkoutId, newDeliveryStatus) {
        if (!Object.values(CheckoutStatus).includes(newDeliveryStatus)) {
            throw new Error('Invalid delivery status');
        }

        const checkout = await Checkout.findById(checkoutId);
        if (!checkout) {
            throw new Error('Checkout not found');
        }

        // Find the user to include their name in notifications
        const user = await User.findById(checkout.user);
        if (!user) {
            throw new Error('User not found');
        }

        checkout.deliveryStatus = newDeliveryStatus;
        await checkout.save();

        // Notify the user of the update.
        await userNotifications(
            checkout.userDetails.email,
            'Delivery Status Update',
            `Your order delivery status has been updated to: ${newDeliveryStatus}`
        );

        const socket = getIO();
        if (socket) {
            socket.to('adminRoom').emit('adminNotification', {
                type: 'delivery_status_update',
                message: `${user.firstName} ${user.lastName}'s order delivery status updated to ${newDeliveryStatus}`,
                data: {
                    checkoutId: checkout._id,
                    // userId: checkout.user,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    deliveryStatus: checkout.deliveryStatus,
                    paymentType: checkout.paymentType,
                    paymentStatus: checkout.paymentStatus
                },
            });
        }

        // Create persistent notification
        await NotificationService.addNotification(
            'delivery_status_update',
            `${user.firstName} ${user.lastName}'s order delivery status updated to ${newDeliveryStatus}`,
            {
                checkoutId: checkout._id,
                // userId: checkout.user,
                firstName: user.firstName,
                lastName: user.lastName,
                deliveryStatus: checkout.deliveryStatus,
                paymentType: checkout.paymentType,
                paymentStatus: checkout.paymentStatus
            }
        );

        return checkout;
    }

    static async getCheckoutById(checkoutId) {
        return Checkout.findById(checkoutId).populate('user products.product');
    }

    static async cancelCheckout(checkoutId) {
        const checkout = await Checkout.findById(checkoutId);
        if (!checkout) {
            throw new Error('Checkout not found');
        }

        // Check if current time is greater than the cancellation deadline
        if (new Date() > new Date(checkout.cancellationDeadline)) {
            throw new Error('Cancellation deadline has passed');
        }

        if (checkout.paymentStatus === 'paid') {
            throw new Error('Cannot cancel a completed checkout');
        }

        // Find the user to include their name in notifications
        const user = await User.findById(checkout.user);
        if (!user) {
            throw new Error('User not found');
        }

        await Checkout.deleteOne({ _id: checkoutId });

        const socket = getIO();
        if (socket) {
            socket.to('adminRoom').emit('adminNotification', {
                type: 'checkout_cancelled',
                message: `${user.firstName} ${user.lastName} cancelled their checkout ${checkoutId}`,
                data: {
                    checkoutId,
                    // userId: checkout.user,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    paymentType: checkout.paymentType,
                    totalAmount: checkout.totalAmount
                },
            });
        }

        // Create persistent notification
        await NotificationService.addNotification(
            'checkout_cancelled',
            `${user.firstName} ${user.lastName} cancelled their checkout ${checkoutId}`,
            {
                checkoutId,
                userId: checkout.user,
                firstName: user.firstName,
                lastName: user.lastName,
                paymentType: checkout.paymentType,
                totalAmount: checkout.totalAmount
            }
        );

        return checkout;
    }

    static async getCheckouts() {
        return Checkout.find().populate('user products.product');
    }

    static async searchCheckouts(queryParams) {

        const query = {};
        if (queryParams.email) {
            query['userDetails.email'] = { $regex: queryParams.email, $options: 'i' };
        }
        if (queryParams.paymentStatus) {
            query.paymentStatus = queryParams.paymentStatus;
        }
        if (queryParams.paymentReference) {
            query.paymentReference = queryParams.paymentReference;
        }
        if (queryParams.deliveryStatus) {
            query.deliveryStatus = queryParams.deliveryStatus;
        }

        return Checkout.find(query).populate('user products.product');
    }
}

module.exports = CheckoutService;