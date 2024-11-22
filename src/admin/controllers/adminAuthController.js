const adminAuthService = require('../services/adminAuthService');
const { sendErrorResponse, sendSuccessResponse } = require('../../utils/responseHandler');

const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const token = await adminAuthService.authenticateAdmin(email, password);
        sendSuccessResponse(res, { token });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

// Create a new admin
const createAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const newAdmin = await adminAuthService.createAdminAccount(email, password);
        sendSuccessResponse(res, { message: 'Admin created successfully'});
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

module.exports = { loginAdmin, createAdmin };
