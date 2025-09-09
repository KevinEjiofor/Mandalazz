class CheckoutValidator {
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
}

module.exports = CheckoutValidator;