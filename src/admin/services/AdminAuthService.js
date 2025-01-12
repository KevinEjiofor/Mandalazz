const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findAdminByEmail, createAdmin } = require('../data/repositories/adminRepository');
const { JWT_SECRET } = require('../../config/config');
const { userNotifications } = require('../../utils/emailHandler');
const { generateResetToken } = require('../../utils/tokenGenerator');
const { checkIfAdminExists } = require('../../utils/validation');
const User = require('../../user/data/models/userModel');

class AdminAuthService {

    async authenticateAdmin(email, password) {
        const admin = await findAdminByEmail(email);
        if (!admin) {
            throw new Error('Invalid email or password');
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            throw new Error('Invalid email or password');
        }

        const token = jwt.sign(
            { id: admin._id, role: admin.role },
            JWT_SECRET,
            { expiresIn: '3h' }
        );

        const subject = 'Login Alert';
        const text = `Hi Everything Mandelazz's Admin,\n\nYou just logged in to the platform.\n\nIf this wasn't you, please contact support immediately.\n\nThank you!`;
        await userNotifications(email, subject, text);

        return token;
    }


    async createAdminAccount(name, email, password) {
        await checkIfAdminExists(name, email);

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = await createAdmin(name, email, hashedPassword);

        const subject = 'Welcome to the Platform';
        const text = `Hi ${name},\n\nYour admin account has been successfully created.\n\nThank you!`;
        await userNotifications(email, subject, text);

        return newAdmin;
    }



    async forgotPassword(email) {
        const admin = await findAdminByEmail(email);
        if (!admin) {
            throw new Error('Admin not found with this email');
        }

        const resetToken = generateResetToken();
        admin.resetPasswordToken = resetToken;
        admin.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes expiration
        await admin.save();

        const subject = 'Password Reset Token';
        const text = `Hi ${admin.name},\n\nYour password reset token is ${resetToken}.\n\nIt will expire in 10 minutes.\n\nThank you!`;
        await userNotifications(email, subject, text);

        return resetToken;
    }


    async validateResetToken(email, token) {
        const admin = await findAdminByEmail(email);
        if (!admin) {
            throw new Error('Admin not found with this email');
        }

        if (admin.resetPasswordToken !== token || admin.resetPasswordExpire < Date.now()) {
            throw new Error('Invalid or expired reset token');
        }

        return true;
    }


    async resetPassword(email, token, newPassword) {
        const admin = await findAdminByEmail(email);
        if (!admin) {
            throw new Error('Admin not found with this email');
        }

        if (admin.resetPasswordToken !== token || admin.resetPasswordExpire < Date.now()) {
            throw new Error('Invalid or expired reset token');
        }

        admin.password = await bcrypt.hash(newPassword, 10);
        admin.resetPasswordToken = undefined;
        admin.resetPasswordExpire = undefined;

        await admin.save();

        return admin;
    }

    logoutUser() {

        return { message: 'Logout successful' };
    }



    async getUserOverviews(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const users = await User.find()
            .select('firstName lastName role activityLogs createdAt') // Select necessary fields
            .sort({ createdAt: -1 }) // Sort by newest
            .skip(skip)
            .limit(limit);

        const formattedUsers = users.map(user => ({
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            activityLogs: user.activityLogs,
            createdAt: user.createdAt,
        }));

        const totalUsers = await User.countDocuments();

        return {
            users: formattedUsers,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: page,
        };
    }
}

module.exports = new AdminAuthService();
