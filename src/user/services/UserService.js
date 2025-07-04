const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserRepository = require('../data/repositories/UserRepository');
const { checkIfUserExists } = require('../../utils/validation');
const { sendEmail } = require('../../utils/emailHandler');
const { generateResetToken } = require('../../utils/tokenGenerator');
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

        return jwt.sign({id: user._id, role: user.role}, process.env.JWT_SECRET, {expiresIn: '5h'}) ;
    }

    static async createUserAccount(firstName, lastName, email, password) {
        await checkIfUserExists(email);
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = generateResetToken();

        const newUser = await UserRepository.createUser(firstName, lastName, email, hashedPassword);
        newUser.emailVerificationToken = verificationToken;
        newUser.emailVerificationExpire = Date.now() + 30 * 60 * 1000;
        await newUser.save();

        const subject = 'Welcome to Our Platform';
        const text = `Hi ${firstName},\n\nWelcome! Verify your email using this code: ${verificationToken} (expires in 30 mins).`;

        await sendEmail(email, subject, text);
        return newUser;
    }

    static async verifyEmail(email, token) {
        const user = await UserRepository.getUserByEmail(email);
        if (!user || user.emailVerified) throw new Error('Invalid operation');
        if (user.emailVerificationToken !== token || user.emailVerificationExpire < Date.now()) {
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

        const token = generateResetToken();
        user.emailVerificationToken = token;
        user.emailVerificationExpire = Date.now() + 30 * 60 * 1000;
        await user.save();

        const subject = 'Email Verification';
        const text = `Hi ${user.firstName},\n\nUse this code to verify your email: ${token} (expires in 30 mins).`;

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

        const resetPin = generateResetToken();
        user.resetPasswordPin = resetPin;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
        await user.save();

        const subject = 'Password Reset PIN';
        const text = `Hi ${user.firstName},\n\nYour password reset PIN is ${resetPin} (expires in 10 mins).`;

        await sendEmail(email, subject, text);
        return resetPin;
    }

    static async validateResetToken(email, token) {
        const user = await UserRepository.getUserByEmail(email);
        if (!user || user.resetPasswordPin !== token || user.resetPasswordExpire < Date.now()) {
            throw new Error('Invalid or expired reset token');
        }

        return true;
    }

    static async resetPassword(email, token, newPassword) {
        const user = await UserRepository.getUserByEmail(email);
        if (!user || user.resetPasswordPin !== token || user.resetPasswordExpire < Date.now()) {
            throw new Error('Invalid or expired reset token');
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordPin = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        return user;
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