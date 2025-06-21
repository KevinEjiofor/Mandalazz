const AddressService = require('../services/AddressService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');

class AddressController {

    static async createAddress(req, res) {
        try {
            const userId = req.user.id;
            const addressData = req.body;

            if (addressData.user && addressData.user !== userId) {
                return sendErrorResponse(res, {
                    message: 'Cannot create address for another user'
                }, 403);
            }

            const address = await AddressService.createAddress(userId, addressData);

            sendSuccessResponse(res, {
                message: 'Address created successfully.',
                address,
            }, 201);
        } catch (error) {
            sendErrorResponse(res, {
                message: error.message || 'Failed to create address.'
            });
        }
    }


    static async getUserAddresses(req, res) {
        try {
            const userId = req.user.id;
            const addresses = await AddressService.getUserAddresses(userId);

            sendSuccessResponse(res, {
                message: 'Addresses retrieved successfully.',
                addresses,
                count: addresses.length
            });
        } catch (error) {
            sendErrorResponse(res, {
                message: error.message || 'Failed to retrieve addresses.'
            });
        }
    }


    static async getDefaultAddress(req, res) {
        try {
            const userId = req.user.id;
            const address = await AddressService.getDefaultAddress(userId);

            if (!address) {
                return sendErrorResponse(res, {
                    message: 'No default address found'
                }, 404);
            }

            sendSuccessResponse(res, {
                message: 'Default address retrieved successfully.',
                address,
            });
        } catch (error) {
            sendErrorResponse(res, {
                message: error.message || 'Failed to retrieve default address.'
            });
        }
    }


    static async getAddressById(req, res) {
        try {
            const { addressId } = req.params;
            const userId = req.user.id;

            const address = await AddressService.getAddressById(addressId, userId);

            sendSuccessResponse(res, {
                message: 'Address retrieved successfully.',
                address,
            });
        } catch (error) {
            const statusCode = error.message.includes('not found') ||
            error.message.includes('access denied') ? 404 : 400;
            sendErrorResponse(res, {
                message: error.message || 'Failed to retrieve address.'
            }, statusCode);
        }
    }

    static async updateAddress(req, res) {
        try {
            const { addressId } = req.params;
            const userId = req.user.id;
            const updateData = req.body;

            // Prevent user from changing the user field
            if (updateData.user && updateData.user !== userId) {
                return sendErrorResponse(res, {
                    message: 'Cannot transfer address to another user'
                }, 403);
            }

            const address = await AddressService.updateAddress(addressId, userId, updateData);

            sendSuccessResponse(res, {
                message: 'Address updated successfully.',
                address,
            });
        } catch (error) {
            const statusCode = error.message.includes('not found') ||
            error.message.includes('access denied') ? 404 : 400;
            sendErrorResponse(res, {
                message: error.message || 'Failed to update address.'
            }, statusCode);
        }
    }

    static async deleteAddress(req, res) {
        try {
            const { addressId } = req.params;
            const userId = req.user.id;

            await AddressService.deleteAddress(addressId, userId);

            sendSuccessResponse(res, {
                message: 'Address deleted successfully.',
            });
        } catch (error) {
            const statusCode = error.message.includes('not found') ||
            error.message.includes('access denied') ? 404 : 400;
            sendErrorResponse(res, {
                message: error.message || 'Failed to delete address.'
            }, statusCode);
        }
    }

     static async setDefaultAddress(req, res) {
        try {
            const { addressId } = req.params;
            const userId = req.user.id;

            const address = await AddressService.setDefaultAddress(addressId, userId);

            sendSuccessResponse(res, {
                message: 'Default address updated successfully.',
                address,
            });
        } catch (error) {
            const statusCode = error.message.includes('not found') ||
            error.message.includes('access denied') ? 404 : 400;
            sendErrorResponse(res, {
                message: error.message || 'Failed to set default address.'
            }, statusCode);
        }
    }

    static async searchAddresses(req, res) {
        try {
            const userRole = req.user.role;
            const addresses = await AddressService.searchAddresses(req.query, userRole);

            sendSuccessResponse(res, {
                message: 'Address search completed successfully.',
                addresses,
                count: addresses.length
            });
        } catch (error) {
            const statusCode = error.message.includes('Access denied') ? 403 : 400;
            sendErrorResponse(res, {
                message: error.message || 'Address search failed.'
            }, statusCode);
        }
    }

    static async findNearbyLandmarks(req, res) {
        try {
            const { addressId } = req.params;
            const userId = req.user.id;
            const { type, radius } = req.query;

            const landmarks = await AddressService.findNearbyLandmarks(
                addressId,
                userId,
                { type, radius: radius ? parseInt(radius) : undefined }
            );

            sendSuccessResponse(res, {
                message: 'Nearby landmarks retrieved successfully.',
                landmarks,
                count: landmarks.length
            });
        } catch (error) {
            const statusCode = error.message.includes('not found') ||
            error.message.includes('access denied') ? 404 : 400;
            sendErrorResponse(res, {
                message: error.message || 'Failed to find nearby landmarks.'
            }, statusCode);
        }
    }

    static async getAddressSuggestions(req, res) {
        try {
            const { input } = req.query;

            if (!input) {
                return sendErrorResponse(res, {
                    message: 'Input parameter is required'
                });
            }

            const suggestions = await AddressService.getAddressSuggestions(input);

            sendSuccessResponse(res, {
                message: 'Address suggestions retrieved successfully.',
                suggestions,
                count: suggestions.length
            });
        } catch (error) {
            sendErrorResponse(res, {
                message: error.message || 'Failed to get address suggestions.'
            });
        }
    }

    static async validateAddress(req, res) {
        try {
            const { address, lat, lng, landmark } = req.body;

            if (!address && (!lat || !lng)) {
                return sendErrorResponse(res, {
                    message: 'Either address or coordinates (lat, lng) must be provided'
                });
            }

            const GoogleMapsService = require('../../utils/googleMapsService');
            const locationData = await GoogleMapsService.validateAndEnrichAddress({
                address, lat, lng, landmark
            });

            sendSuccessResponse(res, {
                message: 'Address validated successfully.',
                locationData,
            });
        } catch (error) {
            sendErrorResponse(res, {
                message: error.message || 'Address validation failed.'
            });
        }
    }
}

module.exports = AddressController;