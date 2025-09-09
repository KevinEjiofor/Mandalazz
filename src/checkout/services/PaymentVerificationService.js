const CheckoutService = require('./CheckoutService');
const cron = require('node-cron');

class PaymentVerificationService {
    static init() {
        // Check pending payments every 30 minutes
        cron.schedule('*/30 * * * *', async () => {
            try {
                console.log('[Cron] Running pending payment verification...');
                const results = await CheckoutService.checkPendingPayments();
                console.log('[Cron] Payment verification completed:', results);
            } catch (error) {
                console.error('[Cron] Error in payment verification:', error);
            }
        });

        console.log('Payment verification service initialized');
    }
}

module.exports = PaymentVerificationService;