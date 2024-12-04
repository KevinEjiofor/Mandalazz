const userService = require('../services/userService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/responseHandler');
const createUserController = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        const user = await userService.createUserAccount(firstName, lastName, email, password);
        sendSuccessResponse(res, { message: 'User created successfully'});
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

const loginUserController = async (req, res) => {
    try {
        const { email, password } = req.body;
        const token = await userService.authenticateUser(email, password);
        sendSuccessResponse(res, { token });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

const forgotPasswordController = async (req, res) => {
    try {
        const { email } = req.body;
        await userService.forgotPassword(email);
        sendSuccessResponse(res, { message: 'Reset PIN sent to email' });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

const validateResetTokenController = async (req, res) => {
    try {
        const { email, token } = req.body;
        await userService.validateResetToken(email, token);
        sendSuccessResponse(res, { message: 'Token is valid' });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

const resetPasswordController = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        await userService.resetPassword(email, token, newPassword);
        sendSuccessResponse(res, { message: 'Password reset successful' });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

const logoutController = (req, res) => {
    sendSuccessResponse(res, { message: 'Logout successful' });
};

module.exports = {
    createUserController,
    loginUserController,
    forgotPasswordController,
    validateResetTokenController,
    resetPasswordController,
    logoutController,
};
