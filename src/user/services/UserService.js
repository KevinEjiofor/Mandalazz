const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UserRepository = require('../data/repositories/UserRepository');
const User = require('../data/models/userModel');
const { checkIfUserExists } = require('../../utils/validation');
const { sendEmail } = require('../../utils/emailHandler');
const CartService = require('../../cart/services/CartService');
const RecentViewService = require('../../recentView/services/RecentViewService');

class UserService {

    static async authenticateUser(email, password, guestId) {
        const user = await UserRepository.getUserByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new Error('Invalid email or password');
        }

        if (guestId) {
            await this.handleUserSessionData(user._id, guestId);
        }

        return jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '5h' }
        );
    }

    static async createUserAccount(firstName, lastName, email, password) {
        await checkIfUserExists(email);
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await UserRepository.createUser(firstName, lastName, email, hashedPassword);


        const rawVerificationToken = newUser.createEmailVerificationToken();
        await newUser.save();

        const subject = 'Welcome to Our  Everything Mandelazz';
        const text = `Hi ${newUser.firstName},
            
            Welcome to Everything Mandalle! Please verify your email using the code below:
            
            Verification Code: ${rawVerificationToken}
            
            This code expires in 30 minutes. If you didn’t sign up, please ignore this email.
            
            Best,
            The  Everything Mandelazz Team
            `;

        await sendEmail(email, subject, text);
        return newUser;
    }

    static async verifyEmail(email, token) {
        const user = await UserRepository.getUserByEmail(email);
        if (!user || user.emailVerified) throw new Error('Invalid operation');


        if (!user.emailVerificationToken || user.emailVerificationExpire < Date.now()) {
            throw new Error('Invalid or expired verification token');
        }


        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        if (user.emailVerificationToken !== hashedToken) {
            throw new Error('Invalid or expired verification token');
        }

        user.emailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationExpire = null;
        await user.save();

        return user;
    }

    static async resendVerificationEmail(email) {
        const user = await UserRepository.getUserByEmail(email);
        if (!user || user.emailVerified) throw new Error('Invalid operation');

        const rawToken = user.createEmailVerificationToken();
        await user.save();

        const subject = 'Email Verification';
        const text =
            ` Hi ${user.firstName},

        Here’s your email verification code:

            Verification Code: ${rawToken}

        It will expire in 30 minutes. If you already verified your email, you can safely ignore this message.

            Best,
            The EVerythin Mandallezz Team'`;

        await sendEmail(email, subject, text);
        return true;
    }

    static async checkEmailVerificationStatus(userId) {
        const user = await UserRepository.findUserById(userId);
        if (!user) throw new Error('User not found');

        return {
            verified: user.emailVerified,
            email: user.email
        };
    }

    static async forgotPassword(email) {
        const user = await UserRepository.getUserByEmail(email);
        if (!user) throw new Error('No user found with this email');

        const rawResetToken = user.createPasswordResetToken();
        await user.save();

        const subject = 'Password Reset PIN';
        const text = `Hi ${user.firstName},

We received a request to reset your password. Use the TOKEN below to proceed:

Reset TOKEN: ${ rawResetToken }

This TOKEN expires in 10 minutes. If you did not request a password reset, no further action is needed.

Regards,
The  Everything Mandelazz Support Team
`;

        await sendEmail(email, subject, text);
        return rawResetToken;
    }

    static async validateResetToken(token) {
        if (!token) throw new Error('Reset token required');

        const cleaned = token.trim();
        const hashedToken = crypto.createHash('sha256').update(cleaned).digest('hex');

        const user = await User.findOne({
            resetPasswordPin: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            throw new Error('Invalid or expired reset token');
        }

        return true;
    }

    static async resetPassword(token, newPassword) {
        if (!token) throw new Error('Reset token is required');
        if (!newPassword || newPassword.length < 6) throw new Error('New password must be at least 6 characters long');

        const cleaned = token.trim();
        const hashedToken = crypto.createHash('sha256').update(cleaned).digest('hex');

        const user = await User.findOne({
            resetPasswordPin: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            throw new Error('Invalid or expired reset token');
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordPin = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        const userSafe = user.toObject();
        delete userSafe.password;
        return userSafe;
    }


    static async changePassword(userId, oldPassword, newPassword) {
        const user = await UserRepository.getUserWithPassword(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordValid) {
            throw new Error('Current password is incorrect');
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            throw new Error('New password must be different from current password');
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await UserRepository.updatePassword(userId, hashedNewPassword);
        await UserRepository.logUserActivity(userId, 'Password changed');

        const subject = 'Password Changed';
        const text = `Hi ${user.firstName},


This is a notification that your account password was successfully changed. If you did not perform this action, please contact support immediately or reset your password again.

Regards,
The  Everything Mandelazz Support Security Team
`;

        await sendEmail(email, subject, text);

        return true;
    }

    static async handleUserSessionData(userId, guestId) {
        try {
            if (guestId) {
                await CartService.mergeGuestCartWithUserCart(guestId, userId);
                await RecentViewService.mergeGuestRecentViewsWithUser(guestId, userId);
            }
        } catch (error) {
            console.error(`❌ Error merging session data for user ${userId}:`, error);
        }
    }

    static async getUserByEmail(email) {
        return await UserRepository.getUserByEmail(email);
    }

    static async logUserActivity(userId, action) {
        return await UserRepository.logUserActivity(userId, action);
    }

    static async getUserActivityLogs(userId) {
        return await UserRepository.getUserActivityLogs(userId);
    }

    static async updateUserProfile(userId, updateData) {
        const { firstName, lastName, email, phoneNumber, alternateNumber } = updateData;

        const fieldsToUpdate = {};

        if (firstName !== undefined && firstName.trim()) {
            fieldsToUpdate.firstName = firstName.trim();
        }

        if (lastName !== undefined && lastName.trim()) {
            fieldsToUpdate.lastName = lastName.trim();
        }

        if (email !== undefined && email.trim()) {
            const existingUser = await UserRepository.checkEmailExists(email.trim(), userId);
            if (existingUser) {
                throw new Error('Email already exists');
            }
            fieldsToUpdate.email = email.trim();
            fieldsToUpdate.emailVerified = false;
        }

        if (phoneNumber !== undefined) {
            fieldsToUpdate.phoneNumber = phoneNumber ? phoneNumber.trim() : null;
        }

        if (alternateNumber !== undefined) {
            fieldsToUpdate.alternateNumber = alternateNumber ? alternateNumber.trim() : null;
        }

        if (Object.keys(fieldsToUpdate).length === 0) {
            throw new Error('No valid fields provided for update');
        }

        const updatedUser = await UserRepository.updateUserProfile(userId, fieldsToUpdate);
        await UserRepository.logUserActivity(userId, 'Profile updated');
        return updatedUser;
    }

    static async getUserProfile(userId) {
        const user = await UserRepository.findUserById(userId);
        if (!user) throw new Error('User not found');
        return user;
    }

    static async getUserProfileForUser(userId) {
        const user = await UserRepository.findUserById(userId);
        if (!user) throw new Error('User not found');

        return {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber || null,
            alternateNumber: user.alternateNumber || null,
            emailVerified: user.emailVerified,
            role: user.role,
            memberSince: user.createdAt
        };
    }
}

module.exports = UserService;
