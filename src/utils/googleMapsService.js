const axios = require('axios');

class GoogleMapsService {
    constructor() {
        this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
        this.baseUrl = 'https://maps.googleapis.com/maps/api';

        if (!this.apiKey) {
            throw new Error('Google Maps API key is required. Set GOOGLE_MAPS_API_KEY in environment variables.');
        }
    }


    async geocodeAddress(address) {
        try {
            const response = await axios.get(`${this.baseUrl}/geocode/json`, {
                params: {
                    address: address,
                    key: this.apiKey
                }
            });

            if (response.data.status !== 'OK' || !response.data.results.length) {
                throw new Error(`Geocoding failed: ${response.data.status}`);
            }

            const result = response.data.results[0];
            const location = result.geometry.location;

            // Extract address components
            const addressComponents = result.address_components;
            const locationData = {
                lat: location.lat,
                lng: location.lng,
                placeId: result.place_id,
                formattedAddress: result.formatted_address,
                country: this.extractComponent(addressComponents, 'country'),
                city: this.extractComponent(addressComponents, 'locality') ||
                    this.extractComponent(addressComponents, 'administrative_area_level_2'),
                state: this.extractComponent(addressComponents, 'administrative_area_level_1'),
                postalCode: this.extractComponent(addressComponents, 'postal_code')
            };

            return locationData;
        } catch (error) {
            console.error('Geocoding error:', error.message);
            throw new Error(`Failed to geocode address: ${error.message}`);
        }
    }


    async reverseGeocode(lat, lng) {
        try {
            const response = await axios.get(`${this.baseUrl}/geocode/json`, {
                params: {
                    latlng: `${lat},${lng}`,
                    key: this.apiKey
                }
            });

            if (response.data.status !== 'OK' || !response.data.results.length) {
                throw new Error(`Reverse geocoding failed: ${response.data.status}`);
            }

            const result = response.data.results[0];
            const addressComponents = result.address_components;

            return {
                formattedAddress: result.formatted_address,
                placeId: result.place_id,
                country: this.extractComponent(addressComponents, 'country'),
                city: this.extractComponent(addressComponents, 'locality') ||
                    this.extractComponent(addressComponents, 'administrative_area_level_2'),
                state: this.extractComponent(addressComponents, 'administrative_area_level_1'),
                postalCode: this.extractComponent(addressComponents, 'postal_code')
            };
        } catch (error) {
            console.error('Reverse geocoding error:', error.message);
            throw new Error(`Failed to reverse geocode coordinates: ${error.message}`);
        }
    }


    async validateAndEnrichAddress(addressData) {
        const { address, lat, lng, landmark } = addressData;

        let locationData;

        if (lat && lng) {
            // If coordinates provided, use reverse geocoding
            locationData = await this.reverseGeocode(lat, lng);
            locationData.lat = lat;
            locationData.lng = lng;
        } else if (address) {
            // If only address provided, use geocoding
            locationData = await this.geocodeAddress(address);
        } else {
            throw new Error('Either address or coordinates must be provided');
        }

        // Add landmark if provided
        if (landmark) {
            locationData.landmark = landmark;
        }

        return locationData;
    }


    async findNearbyPlaces(lat, lng, type = 'point_of_interest', radius = 1000) {
        try {
            const response = await axios.get(`${this.baseUrl}/place/nearbysearch/json`, {
                params: {
                    location: `${lat},${lng}`,
                    radius: radius,
                    type: type,
                    key: this.apiKey
                }
            });

            if (response.data.status !== 'OK') {
                throw new Error(`Places search failed: ${response.data.status}`);
            }

            return response.data.results.map(place => ({
                name: place.name,
                placeId: place.place_id,
                location: place.geometry.location,
                vicinity: place.vicinity,
                types: place.types,
                rating: place.rating
            }));
        } catch (error) {
            console.error('Places search error:', error.message);
            throw new Error(`Failed to find nearby places: ${error.message}`);
        }
    }


    extractComponent(components, type) {
        const component = components.find(comp => comp.types.includes(type));
        if (!component) return null;

        return {
            name: component.long_name,
            code: component.short_name
        };
    }

    /**
     * Calculate distance between two points
     * @param {number} lat1 - First point latitude
     * @param {number} lng1 - First point longitude
     * @param {number} lat2 - Second point latitude
     * @param {number} lng2 - Second point longitude
     * @returns {Object} Distance data
     */
    async calculateDistance(lat1, lng1, lat2, lng2) {
        try {
            const response = await axios.get(`${this.baseUrl}/distancematrix/json`, {
                params: {
                    origins: `${lat1},${lng1}`,
                    destinations: `${lat2},${lng2}`,
                    units: 'metric',
                    key: this.apiKey
                }
            });

            if (response.data.status !== 'OK') {
                throw new Error(`Distance calculation failed: ${response.data.status}`);
            }

            const element = response.data.rows[0].elements[0];
            if (element.status !== 'OK') {
                throw new Error(`Distance calculation failed: ${element.status}`);
            }

            return {
                distance: element.distance,
                duration: element.duration
            };
        } catch (error) {
            console.error('Distance calculation error:', error.message);
            throw new Error(`Failed to calculate distance: ${error.message}`);
        }
    }
}

module.exports = new GoogleMapsService();