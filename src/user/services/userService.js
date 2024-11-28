const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../data/models/userModel');
const { checkIfUserExists } = require('../../utils/validation')
const { sendEmail } = require('../../utils/emailService');
const { generateResetToken } = require('../../utils/tokenGenerator');
const { JWT_SECRET } = process.env;

const createUserAccount = async (firstName, lastName, email, password) => {
   await checkIfUserExists(email)

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ firstName, lastName, email, password: hashedPassword });

    const subject = 'Welcome to Our Platform';
    const text = `Hi ${firstName},\n\nYour account has been created successfully.\n\nThank you!`;
    await sendEmail(email, subject, text);

    return newUser;
};

const authenticateUser = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid email or password');
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });

    const subject = 'Login Alert';
    const text = `Hi ${user.firstName},\n\nYou just logged into the platform.\n\nIf this wasn't you, contact support immediately.`;
    await sendEmail(email, subject, text);

    return token;
};

const forgotPassword = async (email) => {
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
};

const validateResetToken = async (email, token) => {
    const user = await User.findOne({ email });
    if (!user || user.resetPasswordPin !== token || user.resetPasswordExpire < Date.now()) {
        throw new Error('Invalid or expired reset token');
    }

    return true;
};

const resetPassword = async (email, token, newPassword) => {
    const user = await User.findOne({ email });
    if (!user || user.resetPasswordPin !== token || user.resetPasswordExpire < Date.now()) {
        throw new Error('Invalid or expired reset token');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordPin = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return user;
};

module.exports = {
    createUserAccount,
    authenticateUser,
    forgotPassword,
    validateResetToken,
    resetPassword,
};

