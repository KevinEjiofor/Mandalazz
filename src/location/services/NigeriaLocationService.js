const nigeriaStates = require('../data/nigeria/nigeriaStatesData');
const { nigeriaLGAs, getLGAsByState } = require('../data/nigeria/nigeriaLGAsData');

class NigeriaLocationService {

    static async getAllStates() {
        try {
            return {
                success: true,
                states: nigeriaStates
            };
        } catch (error) {
            console.error('Error getting Nigerian states:', error.message);
            return {
                success: false,
                message: error.message || 'Failed to get Nigerian states'
            };
        }
    }


    static async getLGAsByState(state) {
        try {
            if (!state) {
                return {
                    success: false,
                    message: 'State name is required'
                };
            }

            // Check if the state exists
            if (!nigeriaStates.includes(state)) {
                return {
                    success: false,
                    message: `State '${state}' not found in Nigeria`
                };
            }

            const lgas = getLGAsByState(state);
            
            return {
                success: true,
                state,
                lgas
            };
        } catch (error) {
            console.error(`Error getting LGAs for state ${state}:`, error.message);
            return {
                success: false,
                message: error.message || `Failed to get LGAs for state ${state}`
            };
        }
    }
}

module.exports = NigeriaLocationService;