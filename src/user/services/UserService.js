const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserRepository = require('../data/repositories/UserRespository');
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
        console.log(`🔄 Starting session data merge for user ${userId} with guest ${guestId}`);

        try {
            if (guestId) {
                // Merge cart data
                await CartService.mergeGuestCartWithUserCart(guestId, userId);

                // Merge recent views
                await RecentViewService.mergeGuestRecentViewsWithUser(guestId, userId);

                console.log(`✅ Session data merge completed for user ${userId}`);
            }
        } catch (error) {
            console.error(`❌ Error merging session data for user ${userId}:`, error);
            // Don't throw the error here to prevent login failure
            // Log it for debugging but allow login to proceed
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
}

module.exports = UserService;