const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../data/models/userModel');
const { checkIfUserExists } = require('../../utils/validation');
const { sendEmail } = require('../../utils/emailService');
const { generateResetToken } = require('../../utils/tokenGenerator');

class UserService {
    static async createUserAccount(firstName, lastName, email, password) {
        await checkIfUserExists(email);

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
        });

        const subject = 'Welcome to Our Platform';
        const text = `Hi ${firstName},\n\nYour account has been created successfully.\n\nThank you!`;
        await sendEmail(email, subject, text);

        return newUser;
    }

    static async authenticateUser(email, password) {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Invalid email or password');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid email or password');
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return token;
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
}

module.exports = UserService;
