const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findAdminByEmail, createAdmin } = require('../data/repositories/adminRepository');
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


const createAdminAccount = async (email, password) => {

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await createAdmin(email, hashedPassword);

    const subject = 'Welcome to the Platform';
    const text = `Hi ${email},\n\nYour admin account has been successfully created.\n\nThank you!`;
    await sendEmail(email, subject, text);

    return newAdmin;
};


const sendPasswordResetEmail = async (email) => {
    const admin = await findAdminByEmail(email);
    if (!admin) {
        throw new Error('No account found with this email');
    }

    // Generate a reset token (random string)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store the hashed token in the database (for security)
    admin.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    admin.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // Token valid for 15 minutes
    await admin.save();

    // Send email with the reset token
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const subject = 'Password Reset Request';
    const text = `Hi ${admin.name},\n\nYou requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nIf you didn’t request this, please ignore this email.\n\nThank you!`;
    await sendEmail(email, subject, text);

    return resetUrl; // Useful for testing or logging
};
const resetPassword = async (token, newPassword) => {
    // Hash the received token to match the stored hashed token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find admin with the matching token and valid expiry
    const admin = await Admin.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }, // Ensure the token is not expired
    });

    if (!admin) {
        throw new Error('Invalid or expired reset token');
    }

    // Update the admin's password
    admin.password = await bcrypt.hash(newPassword, 10);
    admin.resetPasswordToken = undefined; // Clear the reset token
    admin.resetPasswordExpires = undefined; // Clear the expiry
    await admin.save();

    return 'Password has been reset successfully';
};


module.exports = {
    authenticateAdmin,
    createAdminAccount,
    sendPasswordResetEmail,
    resetPassword
};

