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
            paymentType: 'payment_on_delivery',
            paymentStatus: 'pending',
        });

        await newCheckout.save();
        await CartService.clearCart(userId);

        await this.sendNotification(
            userDetails.email,
            'Checkout Successful',
            'Your checkout has been processed successfully. Thank you for shopping with us!'
        );

        return newCheckout;
    }

    static async handleOnlinePayment(userDetails, totalAmount, products, userId) {
        const amount = parseFloat(totalAmount.toString());
        if (isNaN(amount) || amount <= 0) {
            throw new Error('Invalid total amount. Please check your cart.');
        }

        const newCheckout = new Checkout({
            user: userId,
            products,
            totalAmount: amount,
            userDetails,
            paymentType: 'online_payment',
            paymentStatus: 'pending',
        });

        await newCheckout.save();


        const paymentResponse = await initializePayment(userDetails.email, amount, {
            reference: newCheckout._id,
        });

        if (!paymentResponse || !paymentResponse.data.authorization_url) {
            throw new Error('Failed to initialize payment');
        }

        await this.sendNotification(
            userDetails.email,
            'Complete Your Payment',
            `Complete your payment using this link: ${paymentResponse.data.authorization_url}`
        );

        await CartService.clearCart(userId);

        return { checkout: newCheckout, paymentUrl: paymentResponse.data.authorization_url };
    }

    static validateCheckoutDetails(userDetails, paymentType) {
        if (!userDetails || !userDetails.address || !userDetails.phoneNumber || !userDetails.email) {
            throw new Error('User details including address, phone number, and email are required');
        }
        if (!['payment_on_delivery', 'online_payment'].includes(paymentType)) {
            throw new Error('Invalid payment type');
        }
    }


    static async handlePaymentWebhook(reference, eventData) {
        const checkout = await Checkout.findById(reference);
        if (!checkout) {
            throw new Error('Checkout not found');
        }

        if (eventData.status === 'success') {
            checkout.paymentStatus = 'paid';
            await checkout.save();

            io.emit('checkoutSuccess', {
                message: 'A payment was successfully completed.',
                checkout,
            });

            await this.sendNotification(
                checkout.userDetails.email,
                'Payment Successful',
                'Your payment has been successfully completed. Thank you for shopping with us!'
            );
        } else {
            checkout.paymentStatus = 'failed';
            await checkout.save();
        }
    }
    static async sendNotification(email, subject, message) {
        await userNotifications(email, subject, message);
    }
}

module.exports = CheckoutService;
