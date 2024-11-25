const adminAuthService = require('../services/adminAuthService');
const { sendErrorResponse, sendSuccessResponse } = require('../../utils/responseHandler');
const {forgotPassword, validateResetToken, resetPassword} = require("../services/adminAuthService");

const loginAdminController = async (req, res) => {
    try {
        const { email, password } = req.body;
        const token = await adminAuthService.authenticateAdmin(email, password);
        sendSuccessResponse(res, { token });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

const createAdminController = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const newAdmin = await adminAuthService.createAdminAccount(name, email, password);
        sendSuccessResponse(res, { message: 'Admin created successfully' });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};
const forgotPasswordController = async (req, res) => {
    try {
        const { email } = req.body;
        await forgotPassword(email);
        sendSuccessResponse(res, { message: 'Reset token sent to email' });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};
const validateResetTokenController = async (req, res) => {
    try {
        const { email, token } = req.body;
        await validateResetToken(email, token);
        sendSuccessResponse(res, { message: 'Token is valid' });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};
const resetPasswordController = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        await resetPassword(email, token, newPassword);
        sendSuccessResponse(res, { message: 'Password reset successful' });
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
    loginAdminController,
    createAdminController,
    forgotPasswordController,
    validateResetTokenController,
    resetPasswordController,
    logoutUser,
};
