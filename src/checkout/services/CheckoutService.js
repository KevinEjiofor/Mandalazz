const Checkout = require('../data/models/checkoutModel');
const { initializePayment } = require('../../utils/paystackHandler');
const CartService = require('../../cart/services/CartService');
const { userNotifications } = require('../../utils/emailHandler');
const { getIO } = require('../../utils/socketHandler');
const CheckoutStatus = require('../../config/checkoutStatus');

class CheckoutService {
    static async createCheckout(userId, checkoutDetails) {
        if (!userId) {
            throw new Error('Only logged-in users can perform checkout');
        }

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
            return this.handleOnlinePayment(userDetails, cart.totalAmount, cart.items, userId, estimatedDeliveryDate, cancellationDeadline);
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
            socket.emit('adminNotification', {
                type: 'paymentStatusUpdate',
                message: `Payment for checkout ${newCheckout._id} has been ${newCheckout.paymentStatus}.`,
                data: newCheckout,
            });
        } else {
            console.error('WebSocket not available. Skipping emit.');
        }

        return newCheckout;
    }

    static async handleOnlinePayment(userDetails, totalAmount, products, userId, estimatedDeliveryDate, cancellationDeadline) {
        const amount = parseFloat(totalAmount.toString());
        if (isNaN(amount) || amount <= 0) {
            throw new Error('Invalid total amount. Please check your cart.');
        }

        const paymentReference = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

        const newCheckout = new Checkout({
            user: userId,
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

        // await userNotifications(
        //     userDetails.email,
        //     'Complete Your Payment',
        //     `Complete your payment using this link: ${paymentResponse.data.authorization_url}`
        // );

        await CartService.clearCart(userId);

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

        const socket = getIO();
        if (socket) {
            socket.emit('adminNotification', {
                type: 'paymentStatusUpdate',
                message: `Payment for checkout ${checkout._id} has been ${checkout.paymentStatus}.`,
                data: checkout,
            });
        } else {
            console.error('WebSocket not available. Skipping emit.');
        }


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

        checkout.paymentStatus = paymentStatus;
        await checkout.save();

        // const socket = getIO();
        // if (socket) {
        //     socket.emit('adminNotification', {
        //         type: 'paymentStatusUpdate',
        //         message: `Payment status for checkout ${checkout._id} updated to ${paymentStatus}.`,
        //         data: checkout,
        //     });
        // }
        //
        // await userNotifications(
        //     checkout.userDetails.email,
        //     'Payment Status Update',
        //     `Your payment status has been updated to: ${paymentStatus}`
        // );

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

        checkout.deliveryStatus = newDeliveryStatus;
        await checkout.save();

        // Optionally notify the user of the update.
        await userNotifications(
            checkout.userDetails.email,
            'Delivery Status Update',
            `Your order delivery status has been updated to: ${newDeliveryStatus}`
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

        await Checkout.deleteOne({ _id: checkoutId });
        return checkout;
    }

    static async getCheckouts() {
        return Checkout.find().populate('user products.product');
    }

    static async searchCheckouts(queryParams) {
        // Build a dynamic query object based on provided query parameters.
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
