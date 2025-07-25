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
            const { email, password } = req.body;

            const guestId = req.session?.guestId || null;

            const result = await UserService.authenticateUser(email, password, guestId);

            let token, userId;
            if (typeof result === 'string') {
                token = result;
            } else {
                token = result.token;
                userId = result.userId;
            }

            if (guestId && req.session) {
                delete req.session.guestId;

            }
            const responseData = { token };
            if (userId) {
                responseData.userId = userId;
            }
            sendSuccessResponse(res, responseData);
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
            sendSuccessResponse(res, { message: 'Verification email resent' });
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
            sendSuccessResponse(res, { message: 'Token validated' });
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

    static async changePassword(req, res) {
        try {
            if (!req.user) {
                return sendErrorResponse(res, 'Authentication required', 401);
            }

            const { id: userId } = req.user;

            if (!userId) {
                return sendErrorResponse(res, 'User ID not found in token', 401);
            }

            const { oldPassword, newPassword } = req.body;

            // Validate required fields
            if (!oldPassword || !newPassword) {
                return sendErrorResponse(res, 'Old password and new password are required', 400);
            }

            // Validate new password length
            if (newPassword.length < 6) {
                return sendErrorResponse(res, 'New password must be at least 6 characters long', 400);
            }

            await UserService.changePassword(userId, oldPassword, newPassword);

            sendSuccessResponse(res, { message: 'Password changed successfully' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async logout(req, res) {
        try {

            if (req.session) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Session destruction error:', err);
                    }
                });
            }
            sendSuccessResponse(res, { message: 'Logged out successfully' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async updateProfile(req, res) {
        try {

            if (!req.user) {
                return sendErrorResponse(res, 'Authentication required', 401);
            }

            const {id: userId } = req.user;

            if (!userId) {
                return sendErrorResponse(res, 'User ID not found in token', 401);
            }


            const { firstName, lastName, email, phoneNumber, alternateNumber } = req.body;

            const updateData = {
                firstName,
                lastName,
                email,
                phoneNumber,
                alternateNumber
            };

            const updatedUser = await UserService.updateUserProfile(userId, updateData);

            sendSuccessResponse(res, {
                message: 'Profile updated successfully',

            });
        } catch (error) {

            sendErrorResponse(res, error.message);
        }
    }

    static async getProfile(req, res) {
        try {

            if (!req.user) {
                return sendErrorResponse(res, 'Authentication required', 401);
            }

            const { id:userId } = req.user;

            if (!userId) {
                return sendErrorResponse(res, 'User ID not found in token', 401);
            }


            const user = await UserService.getUserProfile(userId);

            sendSuccessResponse(res, { user });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async getProfileForUser(req, res) {
        try {

            if (!req.user) {
                return sendErrorResponse(res, 'Authentication required', 401);
            }

            const { id:userId } = req.user;

            if (!userId) {
                return sendErrorResponse(res, 'User ID not found in token', 401);
            }


            const user = await UserService.getUserProfileForUser(userId);

            sendSuccessResponse(res, { user });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

}

module.exports = UserController;