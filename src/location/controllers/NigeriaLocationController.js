const NigeriaLocationService = require('../services/NigeriaLocationService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');

class NigeriaLocationController {

    static async getAllStates(req, res) {
        try {
            const result = await NigeriaLocationService.getAllStates();
            
            if (!result.success) {
                return sendErrorResponse(res, { message: result.message }, 400);
            }
            
            sendSuccessResponse(res, {
                message: 'Nigerian states retrieved successfully',
                states: result.states
            });
        } catch (error) {
            console.error('Error in getAllStates controller:', error.message);
            sendErrorResponse(res, { message: error.message || 'Failed to get Nigerian states' });
        }
    }
    

    static async getLGAsByState(req, res) {
        try {
            const { state } = req.params;
            
            if (!state) {
                return sendErrorResponse(res, { message: 'State parameter is required' }, 400);
            }
            
            const result = await NigeriaLocationService.getLGAsByState(state);
            
            if (!result.success) {
                return sendErrorResponse(res, { message: result.message }, 400);
            }
            
            sendSuccessResponse(res, {
                message: `LGAs for ${result.state} retrieved successfully`,
                state: result.state,
                lgas: result.lgas
            });
        } catch (error) {
            console.error('Error in getLGAsByState controller:', error.message);
            sendErrorResponse(res, { message: error.message || 'Failed to get LGAs for the specified state' });
        }
    }
}

module.exports = NigeriaLocationController;