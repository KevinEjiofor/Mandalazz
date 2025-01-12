const Product = require('../../product/data/models/productModel');
const Checkout = require('../data/models/checkoutModel');
const { userNotifications } = require('../../utils/emailHandler');
const crypto = require('crypto');
const { initializePayment } = require('../../utils/paystackHandler');

class CheckoutService {
    static async createCheckout(userId, checkoutDetails) {
        const { products, userDetails, paymentType } = checkoutDetails;

        this.validateCheckoutDetails(userDetails, paymentType);
        const { totalAmount, productDetails } = await this.calculateTotalAmount(products);

        const serialCode = crypto.randomBytes(8).toString('hex');
        if (paymentType === 'online_payment') {
            return this.handleOnlinePayment(userDetails, totalAmount, serialCode, productDetails);
        }

        const newCheckout = new Checkout({
            user: userId || null,
            products: productDetails,
            totalAmount,
            userDetails,
            paymentType: 'payment_on_delivery',
            serialCode,
        });

        await newCheckout.save();
        await this.sendNotification(
            userDetails.email,
            'Checkout Successful',
            `Your checkout with serial code ${serialCode} has been processed successfully.`
        );

        return newCheckout;
    }

    static async getCheckoutsByUser(userId) {
        return Checkout.find({ user: userId }).populate('products.product');
    }

    static async getAllCheckouts() {
        return Checkout.find({}).populate('products.product');
    }

    static async updateCheckoutStatus(checkoutId, status) {
        const checkout = await Checkout.findById(checkoutId);
        if (!checkout) throw new Error('Checkout not found');
        checkout.status = status;
        await checkout.save();
        return checkout;
    }

    static async deleteCheckout(checkoutId, userId) {
        const checkout = await Checkout.findOne({ _id: checkoutId, user: userId });
        if (!checkout) throw new Error('Checkout not found or unauthorized');
        await checkout.deleteOne();
        return { message: 'Checkout deleted successfully' };
    }

    static async getCheckoutBySerialCode(serialCode) {
        const checkout = await Checkout.findOne({ serialCode }).populate('products.product');
        if (!checkout) throw new Error('Checkout not found');
        return checkout;
    }

    static validateCheckoutDetails(userDetails, paymentType) {
        if (!userDetails || !userDetails.address || !userDetails.phoneNumber) {
            throw new Error('User details including address and phone number are required');
        }
        if (!['payment_on_delivery', 'online_payment'].includes(paymentType)) {
            throw new Error('Invalid payment type');
        }
    }

    static async calculateTotalAmount(products) {
        let totalAmount = 0;
        const productDetails = await Promise.all(
            products.map(async (item) => {
                const product = await Product.findById(item.product);
                if (!product) throw new Error(`Product with ID ${item.product} not found`);
                totalAmount += product.price * item.quantity;
                return { product: item.product, quantity: item.quantity, size: item.size };
            })
        );
        return { totalAmount, productDetails };
    }

    static async handleOnlinePayment(userDetails, totalAmount, serialCode, productDetails) {
        const paymentResponse = await initializePayment(userDetails.email, totalAmount);
        if (!paymentResponse || !paymentResponse.data.authorization_url) {
            throw new Error('Failed to initialize payment');
        }

        const newCheckout = new Checkout({
            user: null,
            products: productDetails,
            totalAmount,
            userDetails,
            paymentType: 'online_payment',
            serialCode,
        });

        await newCheckout.save();
        await this.sendNotification(
            userDetails.email,
            'Complete Payment',
            `Complete payment using the link: ${paymentResponse.data.authorization_url}`
        );

        return newCheckout;
    }

    static async sendNotification(email, subject, message) {
        await userNotifications(email, subject, message);
    }
}

module.exports = CheckoutService;
