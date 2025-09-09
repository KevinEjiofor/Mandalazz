const AddressService = require('../../address/services/AddressService');

class CheckoutAddressManager {
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

    static async adminUpdateCheckoutAddress(checkoutId, newAddress, adminUser) {
        if (!adminUser || adminUser.role !== 'admin') {
            throw new Error('Unauthorized: Only admins can update checkout addresses.');
        }

        const CheckoutRepo = require('../../checkout/data/repositories/CheckoutRepository');
        AddressService.validateAddressData(newAddress);

        let enrichedAddress = { ...newAddress };
        try {
            const locationData = await require('../googleMapsService').validateAndEnrichAddress({
                address: newAddress.address,
                lat: newAddress.location?.lat,
                lng: newAddress.location?.lng,
                landmark: newAddress.landmark
            });
            enrichedAddress = {
                ...enrichedAddress,
                landmark: locationData.landmark || newAddress.landmark,
                location: {
                    lat: locationData.lat,
                    lng: locationData.lng,
                    placeId: locationData.placeId,
                    formattedAddress: locationData.formattedAddress
                },
                country: locationData.country || { name: 'Unknown', code: 'XX' },
                city: locationData.city?.name || newAddress.city,
                state: locationData.state?.name || newAddress.state,
                postalCode: locationData.postalCode?.name || newAddress.postalCode
            };
        } catch (e) {
            // If enrichment fails, continue with provided data
        }

        const updated = await CheckoutRepo.updateCheckoutUserDetailsById(checkoutId, enrichedAddress);
        return updated;
    }
}

module.exports = CheckoutAddressManager;