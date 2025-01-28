const Checkout = require('../data/models/checkoutModel');
const { initializePayment } = require('../../utils/paystackHandler');
const CartService = require('../../cart/services/CartService');
const { userNotifications } = require('../../utils/emailHandler');
const { io } = require('../../utils/socketHandler');

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

        if (paymentType === 'online_payment') {
            return this.handleOnlinePayment(userDetails, cart.totalAmount, cart.items, userId);
        }

        const newCheckout = new Checkout({
            user: userId,
            products: cart.items,
            totalAmount: cart.totalAmount,
            userDetails,
            paymentReference: null, // No reference needed for cash payment
            paymentType: 'payment_on_delivery',
            paymentStatus: 'pending',
        });

        await newCheckout.save();
        await CartService.clearCart(userId);

        await userNotifications(
            userDetails.email,
            'Checkout Successful',
            'Your checkout has been processed successfully. Thank you for shopping with us!'
        );

        io.emit('adminNotification', {
            type: 'newCheckout',
            message: `A new checkout has been created by user ${userId}`,
            data: newCheckout,
        });

        return newCheckout;
    }

    static async handleOnlinePayment(userDetails, totalAmount, products, userId) {
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
        });

        await newCheckout.save();


        const paymentResponse = await initializePayment(userDetails.email, amount, {
            reference: paymentReference,
        });

        if (!paymentResponse || !paymentResponse.data.authorization_url) {
            throw new Error('Failed to initialize payment');
        }


        await userNotifications(
            userDetails.email,
            'Complete Your Payment',
            `Complete your payment using this link: ${paymentResponse.data.authorization_url}`
        );

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


        io.emit('adminNotification', {
            type: 'paymentStatusUpdate',
            message: `Payment for checkout ${checkout._id} has been ${checkout.paymentStatus}.`,
            data: checkout,
        });


        await userNotifications(
            checkout.userDetails.email,
            'Payment Update',
            `Your payment status is now: ${checkout.paymentStatus}`
        );
    }

    static validateCheckoutDetails(userDetails, paymentType) {
        if (!userDetails || !userDetails.address || !userDetails.phoneNumber || !userDetails.email) {
            throw new Error('User details including address, phone number, and email are required');
        }
        if (!['payment_on_delivery', 'online_payment'].includes(paymentType)) {
            throw new Error('Invalid payment type');
        }
    }
}

module.exports = CheckoutService;
