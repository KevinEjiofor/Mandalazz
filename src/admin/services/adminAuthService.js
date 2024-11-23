const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findAdminByEmail, createAdmin, findAdminByName } = require('../data/repositories/adminRepository');
const { JWT_SECRET } = require('../../config/config');
const { sendEmail } = require('../../utils/emailService');
const crypto = require('crypto');

const authenticateAdmin = async (email, password) => {

    const admin = await findAdminByEmail(email);
    if (!admin) {
        throw new Error('Invalid email or password');
    }


    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
        throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
        { id: admin._id, isAdmin: admin.isAdmin },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
    const subject = 'Login Alert';
    const text = `Hi EveryThing ManDelazz's Admin,\n\nYou just logged in to the platform.\n\nIf this wasn't you, please contact support immediately.\n\nThank you!`;
    await sendEmail(email, subject, text);

    return token;
};


const createAdminAccount = async (name, email, password) => {

    await checkIfAdminExists(name, email);

    const hashedPassword = await bcrypt.hash(password, 10);


    const newAdmin = await createAdmin(name, email, hashedPassword);


    const subject = 'Welcome to the Platform';
    const text = `Hi ${name},\n\nYour admin account has been successfully created.\n\nThank you!`;
    await sendEmail(email, subject, text);

    return newAdmin;
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ message: 'Invalid email address' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User does not exist' });
        }

        const resetPin = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordPin = resetPin;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save();

        const subject = 'Password Reset Request';
        const htmlContent = `
            <p>You requested a password reset</p>
            <p>Your reset pin is: <strong>${resetPin}</strong></p>
            <p>The pin is valid for 10 minutes.</p>
        `;
        await sendEmail(user.email, subject, htmlContent);

        res.status(200).json({ message: 'Password reset pin sent' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


const validateResetPin = async (req, res) => {
    const { resetPin } = req.body;

    if (!resetPin) {
        return res.status(400).json({ message: 'Reset pin is required' });
    }

    try {
        const user = await User.findOne({
            resetPasswordPin: resetPin,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired pin' });
        }

        res.status(200).json({ message: 'Pin is valid', userId: user._id });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


const resetPassword = async (req, res) => {
    const { resetPin, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    try {
        const user = await User.findOne({
            resetPasswordPin: resetPin,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired pin' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        user.resetPasswordPin = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const logoutUser = (req, res) => {
    res.status(200).json({ message: 'Logout successful' });
};

const checkIfAdminExists = async (name, email) => {

    const existingAdminByName = await findAdminByName(name);  // Pass name directly
    if (existingAdminByName) {
        throw new Error('Admin name is already taken. Please choose another name.');
    }

    const existingAdminByEmail = await findAdminByEmail(email);  // Pass email directly
    if (existingAdminByEmail) {
        throw new Error('Email is already in use. Please use a different email address.');
    }
};


module.exports = {
    authenticateAdmin,
    createAdminAccount,
    forgotPassword,
    validateResetPin,
    resetPassword,
    logoutUser,

};

