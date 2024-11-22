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
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const resetUrl = await adminAuthService.sendPasswordResetEmail(email);
        sendSuccessResponse(res, { message: 'Password reset email sent', resetUrl });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const message = await adminAuthService.resetPassword(token, newPassword);
        sendSuccessResponse(res, { message });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

module.exports = { loginAdmin, createAdmin,forgotPassword,resetPassword };
