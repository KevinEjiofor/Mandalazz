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

const createAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const newAdmin = await adminAuthService.createAdminAccount(name, email, password);
        sendSuccessResponse(res, { message: 'Admin created successfully' });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        await adminAuthService.forgotPassword(email);
        sendSuccessResponse(res, { message: 'Password reset pin sent to your email' });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

const validateResetPin = async (req, res) => {
    try {
        const { resetPin } = req.body;
        const userId = await adminAuthService.validateResetPin(resetPin);
        sendSuccessResponse(res, { message: 'Pin is valid', userId });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

const resetPassword = async (req, res) => {
    try {
        const { resetPin, newPassword } = req.body;
        await adminAuthService.resetPassword(resetPin, newPassword);
        sendSuccessResponse(res, { message: 'Password reset successfully' });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

const logoutUser = (req, res) => {
    try {
        adminAuthService.logoutUser();
        sendSuccessResponse(res, { message: 'Logout successful' });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

module.exports = {
    loginAdmin,
    createAdmin,
    forgotPassword,
    validateResetPin,
    resetPassword,
    logoutUser,
};
