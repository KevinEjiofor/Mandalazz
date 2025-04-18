
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../data/models/userModel');
const { checkIfUserExists } = require('../../utils/validation');
const { sendEmail } = require('../../utils/emailHandler');
const { generateResetToken } = require('../../utils/tokenGenerator');
const CartService = require("../../cart/services/CartService");

class UserService {

    static async authenticateUser(email, password, guestId) {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Invalid email or password');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid email or password');
        }


        await this.handleUserCart(user._id, guestId);

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '5h' }
        );

        return token;
    }
    static async createUserAccount(firstName, lastName, email, password) {
        await checkIfUserExists(email);
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate verification token
        const verificationToken = generateResetToken();

        const newUser = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            emailVerificationToken: verificationToken,
            emailVerificationExpire: Date.now() + 30 * 60 * 1000, // 30 minutes
        });

        // Send welcome email first
        const welcomeSubject = 'Welcome to Our Platform';
        const welcomeText = `Hi ${firstName},\n\nWelcome to our platform! Your account has been created successfully.\n\nPlease verify your email using the verification code: ${verificationToken}\n\nThis code will expire in 30 minutes.\n\nThank you!`;

        await sendEmail(email, welcomeSubject, welcomeText);
        return newUser;
    }
    // static async createUserAccount(firstName, lastName, email, password) {
    //     await checkIfUserExists(email);
    //
    //     const hashedPassword = await bcrypt.hash(password, 10);
    //     const newUser = await User.create({
    //         firstName,
    //         lastName,
    //         email,
    //         password: hashedPassword,
    //     });
    //
    //     const subject = 'Welcome to Our Platform';
    //     const text = `Hi ${firstName},\n\nYour account has been created successfully.\n\nThank you!`;
    //     await sendEmail(email, subject, text);
    //
    //     return newUser;
    // }

    static async verifyEmail(email, token) {
        const user = await User.findOne({ email });

        if (!user) {
            throw new Error('User not found');
        }

        if (user.emailVerified) {
            throw new Error('Email already verified');
        }

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
        const user = await User.findOne({ email });

        if (!user) {
            throw new Error('User not found');
        }

        if (user.emailVerified) {
            throw new Error('Email already verified');
        }

        const verificationToken = generateResetToken();
        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
        await user.save();

        const subject = 'Email Verification';
        const text = `Hi ${user.firstName},\n\nYour email verification code is: ${verificationToken}\n\nThis code will expire in 30 minutes.\n\nThank you!`;

        await sendEmail(email, subject, text);
        return true;
    }

    static async checkEmailVerificationStatus(userId) {
        const user = await User.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        return {
            verified: user.emailVerified,
            email: user.email
        };
    }

    static async forgotPassword(email) {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('No user found with this email');
        }

        const resetPin = generateResetToken();
        user.resetPasswordPin = resetPin;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
        await user.save();

        const subject = 'Password Reset PIN';
        const text = `Hi ${user.firstName},\n\nYour password reset PIN is ${resetPin}. It will expire in 10 minutes.\n\nThank you.`;
        await sendEmail(email, subject, text);

        return resetPin;
    }

    static async validateResetToken(email, token) {
        const user = await User.findOne({ email });
        if (!user || user.resetPasswordPin !== token || user.resetPasswordExpire < Date.now()) {
            throw new Error('Invalid or expired reset token');
        }

        return true;
    }

    static async resetPassword(email, token, newPassword) {
        const user = await User.findOne({ email });
        if (!user || user.resetPasswordPin !== token || user.resetPasswordExpire < Date.now()) {
            throw new Error('Invalid or expired reset token');
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordPin = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        return user;
    }
    static async handleUserCart(userId, guestId) {
        if (guestId) {
            await CartService.mergeGuestCartWithUserCart(guestId, userId);
        }
    }

    static async getUserByEmail(email) {
        try {
            const user = await User.findOne({ email });
            if (!user) {
                throw new Error('User not found');
            }
            return user;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = UserService;