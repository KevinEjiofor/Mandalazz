const LocationService = require('../services/LocationService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');

class LocationController {
    static async getAddressSuggestions(req, res) {
        try {
            const { query } = req.query;
            
            if (!query) {
                return sendErrorResponse(res, { message: 'Query parameter is required' }, 400);
            }
            
            const result = await LocationService.getAddressSuggestions(query);
            
            if (!result.success) {
                return sendErrorResponse(res, { message: result.message }, 400);
            }
            
            sendSuccessResponse(res, {
                message: 'Address suggestions retrieved successfully',
                suggestions: result.suggestions
            });
        } catch (error) {
            console.error('Error in getAddressSuggestions controller:', error.message);
            sendErrorResponse(res, { message: error.message || 'Failed to get address suggestions' });
        }
    }
    
    static async getPlaceDetails(req, res) {
        try {
            const { placeId } = req.params;
            
            if (!placeId) {
                return sendErrorResponse(res, { message: 'Place ID is required' }, 400);
            }
            
            const result = await LocationService.getPlaceDetails(placeId);
            
            if (!result.success) {
                return sendErrorResponse(res, { message: result.message }, 400);
            }
            
            sendSuccessResponse(res, {
                message: 'Place details retrieved successfully',
                place: result.place
            });
        } catch (error) {
            console.error('Error in getPlaceDetails controller:', error.message);
            sendErrorResponse(res, { message: error.message || 'Failed to get place details' });
        }
    }
}

module.exports = LocationController;