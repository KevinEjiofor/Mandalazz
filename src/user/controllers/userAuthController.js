const UserService = require('../services/UserService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');
// const CartService = require("../../cart/services/CartService");

class UserController {
    static async createUser(req, res) {
        try {
            const { firstName, lastName, email, password } = req.body;
            const user = await UserService.createUserAccount(firstName, lastName, email, password);

            // if (req.guestId) {
            //     await UserService.handleUserCart(user._id, req.guestId);
            // }

            sendSuccessResponse(res, { message: 'User created successfully' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async loginUser(req, res) {
        try {
            const { email, password } = req.body;

            const token = await UserService.authenticateUser(email, password, req.guestId);
            sendSuccessResponse(res, { token });
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
            sendSuccessResponse(res, { message: 'Token is valid' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async resetPassword(req, res) {
        try {
            const { email, token, newPassword } = req.body;
            await UserService.resetPassword(email, token, newPassword);
            sendSuccessResponse(res, { message: 'Password reset successful' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static logout(req, res) {
        try {

            sendSuccessResponse(res, { message: 'Logout successful' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
}

module.exports = UserController;
