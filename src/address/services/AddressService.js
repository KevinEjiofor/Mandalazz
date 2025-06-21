const AddressRepo = require('../data/repositories/AddressRepository');
const GoogleMapsService = require('../../utils/googleMapsService');
const User = require('../../user/data/models/userModel');

class AddressService {

    static validateAddressData(addressData) {
        const { firstName, lastName, phoneNumber, address } = addressData;

        if (!firstName || !lastName) {
            throw new Error('First name and last name are required');
        }

        if (!phoneNumber) {
            throw new Error('Phone number is required');
        }

        if (!address) {
            throw new Error('Address is required');
        }
    }


    static async verifyAddressOwnership(addressId, userId) {
        const belongs = await AddressRepo.belongsToUser(addressId, userId);
        if (!belongs) {
            throw new Error('Address not found or access denied');
        }
        return true;
    }


    static async createAddress(userId, addressData) {
        this.validateAddressData(addressData);

        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        try {
            // Validate and enrich address with Google Maps
            const locationData = await GoogleMapsService.validateAndEnrichAddress({
                address: addressData.address,
                lat: addressData.location?.lat,
                lng: addressData.location?.lng,
                landmark: addressData.landmark
            });

            // Check if this should be the default address
            const existingAddressesCount = await AddressRepo.countByUser(userId);
            const isDefault = addressData.isDefault || existingAddressesCount === 0;

            const addressPayload = {
                user: userId,
                firstName: addressData.firstName,
                lastName: addressData.lastName,
                phoneNumber: addressData.phoneNumber,
                email: user.email, // Automatically use user's email
                address: addressData.address,
                landmark: locationData.landmark || addressData.landmark,
                location: {
                    lat: locationData.lat,
                    lng: locationData.lng,
                    placeId: locationData.placeId,
                    formattedAddress: locationData.formattedAddress
                },
                country: locationData.country || { name: 'Unknown', code: 'XX' },
                city: locationData.city?.name || addressData.city,
                state: locationData.state?.name || addressData.state,
                postalCode: locationData.postalCode?.name || addressData.postalCode,
                isDefault: isDefault
            };

            const address = await AddressRepo.create(addressPayload);
            return address;
        } catch (error) {
            console.error('Address creation error:', error);
            throw new Error(`Failed to create address: ${error.message}`);
        }
    }


    static async getUserAddresses(userId) {
        return await AddressRepo.findByUserId(userId);
    }


    static async getDefaultAddress(userId) {
        return await AddressRepo.findDefaultByUserId(userId);
    }


    static async getAddressById(addressId, userId) {
        await this.verifyAddressOwnership(addressId, userId);
        return await AddressRepo.findById(addressId, userId);
    }


    static async updateAddress(addressId, userId, updateData) {
        await this.verifyAddressOwnership(addressId, userId);

        const existingAddress = await AddressRepo.findById(addressId, userId);
        if (!existingAddress) {
            throw new Error('Address not found');
        }

        // Validate update data if provided (email is no longer required in updates)
        if (updateData.firstName || updateData.lastName || updateData.phoneNumber || updateData.address) {
            // Get user email for validation
            const user = await User.findById(userId);
            this.validateAddressData({
                ...existingAddress.toObject(),
                ...updateData,
                email: user.email // Use current user email for validation
            });
        }

        let locationData = {};

        // Re-geocode if address or coordinates changed
        if (updateData.address || updateData.location) {
            try {
                locationData = await GoogleMapsService.validateAndEnrichAddress({
                    address: updateData.address || existingAddress.address,
                    lat: updateData.location?.lat,
                    lng: updateData.location?.lng,
                    landmark: updateData.landmark
                });
            } catch (error) {
                console.error('Geocoding error during update:', error);
                // Continue with update even if geocoding fails
            }
        }

        // If email is being updated, get it from user (not from updateData)
        let emailUpdate = {};
        if (updateData.email !== undefined) {
            const user = await User.findById(userId);
            emailUpdate = { email: user.email };
        }

        const updates = {
            ...updateData,
            ...emailUpdate,
            ...(Object.keys(locationData).length > 0 && {
                location: {
                    lat: locationData.lat || existingAddress.location.lat,
                    lng: locationData.lng || existingAddress.location.lng,
                    placeId: locationData.placeId || existingAddress.location.placeId,
                    formattedAddress: locationData.formattedAddress || existingAddress.location.formattedAddress
                },
                country: locationData.country || existingAddress.country,
                city: locationData.city?.name || existingAddress.city,
                state: locationData.state?.name || existingAddress.state,
                postalCode: locationData.postalCode?.name || existingAddress.postalCode
            })
        };

        return await AddressRepo.update(addressId, userId, updates);
    }


    static async deleteAddress(addressId, userId) {
        await this.verifyAddressOwnership(addressId, userId);

        const address = await AddressRepo.findById(addressId, userId);
        if (!address) {
            throw new Error('Address not found');
        }

        if (address.isDefault) {
            // If deleting default address, check if there are other addresses
            const userAddresses = await AddressRepo.findByUserId(userId);
            if (userAddresses.length > 1) {
                // Set another address as default
                const nextAddress = userAddresses.find(addr => addr._id.toString() !== addressId);
                if (nextAddress) {
                    await AddressRepo.setDefault(userId, nextAddress._id);
                }
            }
        }

        return await AddressRepo.delete(addressId, userId);
    }

    static async setDefaultAddress(addressId, userId) {
        await this.verifyAddressOwnership(addressId, userId);
        return await AddressRepo.setDefault(userId, addressId);
    }

    static async searchAddresses(query, userRole) {
        if (userRole !== 'admin') {
            throw new Error('Access denied. Admin privileges required.');
        }
        return await AddressRepo.adminFind(query);
    }


    static async findNearbyLandmarks(addressId, userId, options = {}) {
        await this.verifyAddressOwnership(addressId, userId);

        const address = await AddressRepo.findById(addressId, userId);
        if (!address) {
            throw new Error('Address not found');
        }

        const { type = 'point_of_interest', radius = 1000 } = options;

        return await GoogleMapsService.findNearbyPlaces(
            address.location.lat,
            address.location.lng,
            type,
            radius
        );
    }


    static async getAddressSuggestions(input) {
        try {
            const locationData = await GoogleMapsService.geocodeAddress(input);
            return [locationData];
        } catch (error) {
            console.error('Address suggestion error:', error);
            return [];
        }
    }
}

module.exports = AddressService;