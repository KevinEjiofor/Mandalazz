const UserService = require('../services/UserService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');

class UserController {
    static async createUser(req, res) {
        try {
            const { firstName, lastName, email, password } = req.body;
            await UserService.createUserAccount(firstName, lastName, email, password);
            sendSuccessResponse(res, { message: 'User created successfully' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async loginUser(req, res) {
        try {
            const { email, password, guestId } = req.body;
            const token = await UserService.authenticateUser(email, password, guestId);
            sendSuccessResponse(res, { token });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async verifyEmail(req, res) {
        try {
            const { email, token } = req.body;
            await UserService.verifyEmail(email, token);
            sendSuccessResponse(res, { message: 'Email verified successfully' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async resendVerificationEmail(req, res) {
        try {
            const { email } = req.body;
            await UserService.resendVerificationEmail(email);
            sendSuccessResponse(res, { message: 'Verification email resent successfully' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async checkEmailVerificationStatus(req, res) {
        try {
            const { userId } = req.user;
            const result = await UserService.checkEmailVerificationStatus(userId);
            sendSuccessResponse(res, result);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            await UserService.forgotPassword(email);
            sendSuccessResponse(res, { message: 'Reset PIN sent to email' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async validateResetToken(req, res) {
        try {
            const { email, token } = req.body;
            await UserService.validateResetToken(email, token);
            sendSuccessResponse(res, { message: 'Token validated successfully' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async resetPassword(req, res) {
        try {
            const { email, token, newPassword } = req.body;
            await UserService.resetPassword(email, token, newPassword);
            sendSuccessResponse(res, { message: 'Password reset successfully' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async logout(req, res) {
        try {

            sendSuccessResponse(res, { message: 'Logged out successfully' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
}

module.exports = UserController;
