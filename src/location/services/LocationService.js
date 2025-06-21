const axios = require('axios');
require('dotenv').config();

class LocationService {
    static async getAddressSuggestions(query) {
        try {
            if (!query || query.trim().length < 2) {
                return { success: false, message: 'Query must be at least 2 characters long' };
            }

            // Google Places API requires an API key
            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
                throw new Error('Google Places API key is not configured');
            }

            const response = await axios.get(
                `https://maps.googleapis.com/maps/api/place/autocomplete/json`,
                {
                    params: {
                        input: query,
                        types: 'address',
                        key: apiKey
                    }
                }
            );

            if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
                throw new Error(`Google Places API error: ${response.data.status}`);
            }

            return {
                success: true,
                suggestions: response.data.predictions.map(prediction => ({
                    placeId: prediction.place_id,
                    description: prediction.description
                }))
            };
        } catch (error) {
            console.error('Error getting address suggestions:', error.message);
            return {
                success: false,
                message: error.message || 'Failed to get address suggestions'
            };
        }
    }

    static async getPlaceDetails(placeId) {
        try {
            if (!placeId) {
                return { success: false, message: 'Place ID is required' };
            }

            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
                throw new Error('Google Places API key is not configured');
            }

            const response = await axios.get(
                `https://maps.googleapis.com/maps/api/place/details/json`,
                {
                    params: {
                        place_id: placeId,
                        fields: 'formatted_address,geometry',
                        key: apiKey
                    }
                }
            );

            if (response.data.status !== 'OK') {
                throw new Error(`Google Places API error: ${response.data.status}`);
            }

            const { result } = response.data;
            return {
                success: true,
                place: {
                    address: result.formatted_address,
                    location: {
                        lat: result.geometry.location.lat,
                        lng: result.geometry.location.lng
                    }
                }
            };
        } catch (error) {
            console.error('Error getting place details:', error.message);
            return {
                success: false,
                message: error.message || 'Failed to get place details'
            };
        }
    }
}

module.exports = LocationService;