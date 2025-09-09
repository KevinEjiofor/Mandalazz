const CheckoutRepo = require('../data/repositories/CheckoutRepository');
const { userNotifications } = require('../../utils/emailHandler');

class DeliveryPaymentService {

    static validateDeliveryPaymentData(paymentData) {
        const { actualMethod, receivedBy } = paymentData;

        if (!['cash', 'pos', 'transfer'].includes(actualMethod)) {
            throw new Error('Invalid delivery payment method');
        }

        if (!receivedBy || receivedBy.trim() === '') {
            throw new Error('Delivery agent name is required');
        }

        // Validate POS specific fields
        if (actualMethod === 'pos' && !paymentData.posTerminal) {
            throw new Error('POS terminal ID is required for POS payments');
        }

        // Validate transfer specific fields
        if (actualMethod === 'transfer' && !paymentData.transferReference) {
            throw new Error('Transfer reference is required for bank transfer payments');
        }
    }

    static async recordDeliveryPayment(checkoutId, paymentData, agentInfo = null) {
        // Validate input data
        this.validateDeliveryPaymentData(paymentData);

        // Find the checkout
        const checkout = await CheckoutRepo.findByIdSecure(checkoutId);
        if (!checkout) {
            throw new Error('Checkout not found');
        }

        // Verify this is a payment on delivery order
        if (checkout.paymentType !== 'payment_on_delivery') {
            throw new Error('This order is not a payment on delivery order');
        }

        // Check if payment is already recorded
        if (checkout.paymentStatus === 'paid') {
            throw new Error('Payment has already been recorded for this order');
        }

        // Check if order is delivered or out for delivery
        const validStatuses = ['out_for_delivery', 'delivered'];
        if (!validStatuses.includes(checkout.deliveryStatus)) {
            throw new Error('Order must be out for delivery or delivered to record payment');
        }

        // Prepare payment details
        const deliveryPaymentDetails = {
            actualMethod: paymentData.actualMethod,
            receivedBy: paymentData.receivedBy,
            receivedAt: new Date(),
            notes: paymentData.notes || '',
        };

        // Add method-specific details
        if (paymentData.actualMethod === 'pos') {
            deliveryPaymentDetails.posTerminal = paymentData.posTerminal;
        } else if (paymentData.actualMethod === 'transfer') {
            deliveryPaymentDetails.transferReference = paymentData.transferReference;
        }

        // Map to standardized payment method
        const methodMap = {
            cash: 'cash_on_delivery',
            pos: 'pos_on_delivery',
            transfer: 'transfer_on_delivery'
        };

        const updateData = {
            paymentStatus: 'paid',
            paymentDetails: {
                method: methodMap[paymentData.actualMethod],
                channel: paymentData.actualMethod,
                deliveryPaymentDetails
            },
            deliveryAgent: agentInfo,
            // Update delivery status to delivered if not already
            ...(checkout.deliveryStatus !== 'delivered' && { deliveryStatus: 'delivered' })
        };

        // Update the checkout
        const updatedCheckout = await CheckoutRepo.updateMultipleFieldsSecure(checkoutId, updateData);

        // Send confirmation email to customer
        await this.sendPaymentConfirmationEmail(updatedCheckout, paymentData.actualMethod);

        return updatedCheckout;
    }

    static async confirmDeliveryPayment(checkoutId, adminUserId, confirmationNotes = '') {
        const checkout = await CheckoutRepo.findByIdSecure(checkoutId);
        if (!checkout) {
            throw new Error('Checkout not found');
        }

        if (!checkout.paymentDetails?.deliveryPaymentDetails) {
            throw new Error('No delivery payment details found');
        }

        const updateData = {
            'paymentDetails.deliveryPaymentDetails.confirmedBy': adminUserId,
            'paymentDetails.deliveryPaymentDetails.notes': confirmationNotes
        };

        return await CheckoutRepo.updateMultipleFieldsSecure(checkoutId, updateData);
    }

    static async sendPaymentConfirmationEmail(checkout, paymentMethod) {
        const methodText = {
            cash: 'cash',
            pos: 'POS/Card',
            transfer: 'bank transfer'
        };

        await userNotifications(
            checkout.userDetails.email,
            'Payment Received - Order Delivered',
            `Dear ${checkout.userDetails.firstName},
            
            Your order ${checkout.orderNumber} has been successfully delivered and payment of ₦${checkout.totalAmount} has been received via ${methodText[paymentMethod]}.
            
            Thank you for your business!
            
            Order Details:
            - Order Number: ${checkout.orderNumber}
            - Amount: ₦${checkout.totalAmount}
            - Payment Method: ${methodText[paymentMethod]}
            - Delivered to: ${checkout.userDetails.address}
            `
        );
    }

    static async getDeliveryPaymentStats() {
        const checkouts = await CheckoutRepo.findSecure({
            paymentType: 'payment_on_delivery',
            paymentStatus: 'paid'
        });

        const stats = {
            cash_on_delivery: { count: 0, totalAmount: 0 },
            pos_on_delivery: { count: 0, totalAmount: 0 },
            transfer_on_delivery: { count: 0, totalAmount: 0 }
        };

        checkouts.forEach(checkout => {
            const method = checkout.paymentDetails?.method;
            if (method && stats[method]) {
                stats[method].count++;
                stats[method].totalAmount += parseFloat(checkout.totalAmount.toString());
            }
        });

        return stats;
    }

    static async getPendingDeliveryPayments() {
        return await CheckoutRepo.findSecure({
            paymentType: 'payment_on_delivery',
            paymentStatus: 'pending',
            deliveryStatus: { $in: ['out_for_delivery', 'delivered'] }
        });
    }
}

module.exports = DeliveryPaymentService;