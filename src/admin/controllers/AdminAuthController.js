const AdminAuthService = require('../services/AdminAuthService');
const { sendErrorResponse, sendSuccessResponse } = require('../../utils/respondHandler');

class AdminController {
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const token = await AdminAuthService.authenticateAdmin(email, password);
            sendSuccessResponse(res, { token });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async createAdmin(req, res) {
        try {
            const { name, email, password } = req.body;
            await AdminAuthService.createAdminAccount(name, email, password);
            sendSuccessResponse(res, { message: 'Admin created successfully' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            await AdminAuthService.forgotPassword(email);
            sendSuccessResponse(res, { message: 'Reset token sent to email' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async validateResetToken(req, res) {
        try {
            const { email, token } = req.body;
            await AdminAuthService.validateResetToken(email, token);
            sendSuccessResponse(res, { message: 'Token is valid' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async resetPassword(req, res) {
        try {
            const { email, token, newPassword } = req.body;
            await AdminAuthService.resetPassword(email, token, newPassword);
            sendSuccessResponse(res, { message: 'Password reset successful' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async logout(req, res) {
        try {
            const result = AdminAuthService.logoutUser();
            sendSuccessResponse(res, result);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
    async getUserOverviews(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const userOverviews = await AdminAuthService.getUserOverviews(parseInt(page), parseInt(limit));
            sendSuccessResponse(res, userOverviews);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }


}

module.exports = new AdminController();
