const CheckoutRepo = require('../data/repositories/CheckoutRepository');
const User = require('../../user/data/models/userModel');
const CartService = require('../../cart/services/CartService');
const AddressService = require('../../address/services/AddressService');
const { initializePayment, verifyPayment } = require('../../utils/paystackHandler');
const { userNotifications } = require('../../utils/emailHandler');
const { getIO } = require('../../utils/socketHandler');
const NotificationService = require('../../notification/service/NotificationService');
const CheckoutStatus = require('../../enums/checkoutStatus');
const { generateOrderNumber } = require('../../utils/tokenGenerator');
const DeliveryPaymentService = require('./DeliveryPaymentService');
const CheckoutValidator = require('../../utils/checkoutUtils/CheckoutValidator');
const PaymentProcessor = require('../../utils/checkoutUtils/PaymentProcessor');
const CheckoutNotifier = require('../../utils/checkoutUtils/CheckoutNotifier');
const CheckoutAddressManager = require('../../utils/checkoutUtils/CheckoutAddressManager');
const CheckoutStatusManager = require('../../utils/checkoutUtils/CheckoutStatusManager');

class CheckoutService {
    static async createCheckout(userId, { userDetails, paymentType }) {
        if (!userId) throw new Error('Only logged-in users can perform checkout');

        CheckoutValidator.validateCheckoutRequest(userDetails, paymentType);

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const cart = await CartService.getCart(userId);
        if (!cart?.items?.length) throw new Error('Cart is empty.');

        const addressDetails = await CheckoutAddressManager.getOrCreateAddressDetails(userDetails, userId);
        const { estimatedDelivery, cancellationDeadline } = CheckoutStatusManager.calculateDeliveryDates(paymentType);

        const initialTimeline = [{
            status: paymentType === 'online_payment' ? CheckoutStatus.UNDER_PROCESS : CheckoutStatus.PENDING,
            changedAt: new Date(),
            note: 'Order created'
        }];

        if (paymentType === 'online_payment') {
            return PaymentProcessor.processOnlinePayment(user, addressDetails, cart, estimatedDelivery, cancellationDeadline, initialTimeline);
        }

        return PaymentProcessor.processPaymentOnDelivery(user, addressDetails, cart, estimatedDelivery, cancellationDeadline, initialTimeline);
    }

    static async handlePaymentWebhook(reference, webhookData) {
        return PaymentProcessor.handlePaymentWebhook(reference, webhookData);
    }

    static async verifyPaymentManually(checkoutId) {
        return PaymentProcessor.verifyPaymentManually(checkoutId);
    }

    static async updatePaymentStatus(checkoutId, paymentStatus) {
        return CheckoutStatusManager.updatePaymentStatus(checkoutId, paymentStatus);
    }

    static async updateDeliveryStatus(checkoutId, newDeliveryStatus, note = null) {
        return CheckoutStatusManager.updateDeliveryStatus(checkoutId, newDeliveryStatus, note);
    }

    static async cancelCheckout(checkoutId) {
        return CheckoutStatusManager.cancelCheckout(checkoutId);
    }

    static async getCheckouts(options = {}) {
        return CheckoutStatusManager.getCheckouts(options);
    }

    static getCheckoutById(id) {
        return CheckoutRepo.findByIdSecure(id);
    }

    static async getDeliveredOrders(userId) {
        return CheckoutStatusManager.getDeliveredOrders(userId);
    }

    static async getUserCheckouts(userId) {
        return CheckoutStatusManager.getUserCheckouts(userId);
    }

    static searchCheckouts(params) {
        return CheckoutStatusManager.searchCheckouts(params);
    }

    static async getLocationStatistics() {
        return CheckoutStatusManager.getLocationStatistics();
    }

    static async getPaymentMethodStatistics() {
        return CheckoutStatusManager.getPaymentMethodStatistics();
    }

    static async adminUpdateCheckoutAddress(checkoutId, newAddress, adminUser) {
        return CheckoutAddressManager.adminUpdateCheckoutAddress(checkoutId, newAddress, adminUser);
    }

    static async recordDeliveryPayment(checkoutId, paymentData, agentInfo) {
        return DeliveryPaymentService.recordDeliveryPayment(checkoutId, paymentData, agentInfo);
    }

    static async confirmDeliveryPayment(checkoutId, adminUserId, notes) {
        return DeliveryPaymentService.confirmDeliveryPayment(checkoutId, adminUserId, notes);
    }

    static async getPendingDeliveryPayments() {
        return DeliveryPaymentService.getPendingDeliveryPayments();
    }

    static async getEnhancedPaymentMethodStatistics() {
        return CheckoutStatusManager.getEnhancedPaymentMethodStatistics();
    }

    static async assignDeliveryAgent(checkoutId, agentInfo, newDeliveryStatus = 'out_for_delivery') {
        return CheckoutStatusManager.assignDeliveryAgent(checkoutId, agentInfo, newDeliveryStatus);
    }
}

module.exports = CheckoutService;