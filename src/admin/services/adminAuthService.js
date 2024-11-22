const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findAdminByEmail, createAdmin } = require('../data/repositories/adminRepository');
const { JWT_SECRET } = require('../../config/config');
const { sendEmail, ADMIN_EMAIL } = require('../../utils/emailService');

/**
 * Authenticate an admin using email and password.
 * @param {string} email - The admin's email.
 * @param {string} password - The admin's password.
 * @returns {string} - JWT token for the authenticated admin.
 * @throws {Error} - If authentication fails.
 */
const authenticateAdmin = async (email, password) => {
    // Find admin by email
    const admin = await findAdminByEmail(email);
    if (!admin) {
        throw new Error('Invalid email or password');
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
        throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = jwt.sign(
        { id: admin._id, isAdmin: admin.isAdmin },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    // Notify admin of login
    const subject = 'Admin Login Notification';
    const text = `The admin with email ${email} has logged in.`;
    const html = `<p>The admin with email <strong>${email}</strong> has logged in.</p>`;
    await sendEmail(ADMIN_EMAIL, subject, text, html);

    return token;
};

/**
 * Create a new admin account.
 * @param {string} email - The admin's email.
 * @param {string} password - The admin's password.
 * @returns {Object} - The newly created admin account.
 * @throws {Error} - If account creation fails.
 */
const createAdminAccount = async (email, password) => {
    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the new admin in the database
    const newAdmin = await createAdmin(email, hashedPassword);
    //
    // // Notify admin of new signup
    // const subject = 'New Admin Sign Up Notification';
    // const text = `A new admin has been registered with the email: ${email}.`;
    // const html = `<p>A new admin has been registered with the email: <strong>${email}</strong>.</p>`;
    // await sendEmail(ADMIN_EMAIL, subject, text, html);

    return newAdmin;
};

module.exports = { authenticateAdmin, createAdminAccount };
