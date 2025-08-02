const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
    findAdminByEmail,
    findAdminByName,
    createAdmin,
    updatePassword
} = require('../data/repositories/adminRepository');
const { JWT_SECRET } = require('../../config/config');
const { userNotifications } = require('../../utils/emailHandler');
const { checkIfAdminExists } = require('../../utils/validation');
const Admin = require('../data/models/adminModel');

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
        const text = `Hi ${admin.name},\n\nYou just logged in to the platform.\n\nIf this wasn't you, please contact support immediately.\n\nThank you!`;
        await userNotifications(email, subject, text);

        return token;
    }

    async createAdminAccount(name, email, password) {
        await checkIfAdminExists(name, email); // should validate both uniqueness

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


        const rawResetToken = admin.createPasswordResetToken();
        await admin.save();

        const subject = 'Password Reset Token';
        const text = `Hi ${admin.name},\n\nYour new password reset Token is: ${rawResetToken}\nIt will expire in 10 minutes.\n\nThank you!`;
        await userNotifications(email, subject, text);

        return rawResetToken;
    }

    async validateResetToken(email, token) {
        const admin = await findAdminByEmail(email);
        if (!admin) {
            throw new Error('Admin not found with this email');
        }

        if (!token) throw new Error('Reset token required');

        const cleaned = token.trim();
        const hashed = crypto.createHash('sha256').update(cleaned).digest('hex');

        if (
            admin.resetPasswordToken !== hashed ||
            !admin.resetPasswordExpire ||
            admin.resetPasswordExpire < Date.now()
        ) {
            throw new Error('Invalid or expired reset token');
        }

        return true;
    }

    async resetPassword(email, token, newPassword) {
        const admin = await findAdminByEmail(email);
        if (!admin) {
            throw new Error('Admin not found with this email');
        }

        if (!token) throw new Error('Reset token required');
        if (!newPassword || newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters long');
        }

        const cleaned = token.trim();
        const hashed = crypto.createHash('sha256').update(cleaned).digest('hex');

        if (
            admin.resetPasswordToken !== hashed ||
            !admin.resetPasswordExpire ||
            admin.resetPasswordExpire < Date.now()
        ) {
            throw new Error('Invalid or expired reset token');
        }

        admin.password = await bcrypt.hash(newPassword, 10);
        admin.resetPasswordToken = undefined;
        admin.resetPasswordExpire = undefined;
        await admin.save();

        const safeAdmin = admin.toObject();
        delete safeAdmin.password;
        return safeAdmin;
    }

    async changePassword(adminId, oldPassword, newPassword) {
        const admin = await Admin.findById(adminId);
        if (!admin) {
            throw new Error('Admin not found');
        }

        const isOldValid = await bcrypt.compare(oldPassword, admin.password);
        if (!isOldValid) {
            throw new Error('Current password is incorrect');
        }

        const isSame = await bcrypt.compare(newPassword, admin.password);
        if (isSame) {
            throw new Error('New password must be different from current password');
        }

        const hashedNew = await bcrypt.hash(newPassword, 10);
        await updatePassword(adminId, hashedNew);

        return true;
    }

    logoutUser() {
        return { message: 'Logout successful' };
    }

    async getUserOverviews(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const users = await require('../../user/data/models/userModel')
            .find()
            .select('firstName lastName role activityLogs createdAt')
            .populate('checkouts')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const formattedUsers = users.map(user => ({
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            activityLogs: user.activityLogs,
            createdAt: user.createdAt,
            checkouts: user.checkouts
        }));

        const totalUsers = await require('../../user/data/models/userModel').countDocuments();

        return {
            users: formattedUsers,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: page
        };
    }
}

module.exports = new AdminAuthService();
