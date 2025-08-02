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

        const subject = 'New Admin Login Detected';
        const text = `Hi ${admin.name},

We noticed a login to your admin account just now (UTC time: ${new Date().toISOString()}).

If this was you, no further action is needed.
If you did not initiate this login, please change your password immediately and review access logs.

Thank you,
Support Team`;

        await userNotifications(email, subject, text);

        return token;
    }

    async createAdminAccount(name, email, password) {
        await checkIfAdminExists(name, email);

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = await createAdmin(name, email, hashedPassword);

        const subject = 'Admin Account Created';
        const text = `Hi ${name},

Your admin account has been successfully created. You can now log in with your credentials.

If you did not request this account, please contact support.

Best regards,
Support Team`;

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

        const subject = 'Password Reset PIN';
        const text = `Hi ${admin.name},

We received a request to reset your password. Use the PIN below to proceed:

Reset TOKEN: ${rawResetToken}

This TOKEN will expire in 10 minutes. If you did not request a password reset, ignore this message or contact support.

Regards,
Support Team`;

        await userNotifications(email, subject, text);
        return rawResetToken;
    }

    async validateResetToken(token) {
        if (!token) throw new Error('Reset token required');

        const cleaned = token.trim();
        const hashed = crypto.createHash('sha256').update(cleaned).digest('hex');

        const admin = await Admin.findOne({
            resetPasswordToken: hashed,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!admin) {
            throw new Error('Invalid or expired reset token');
        }

        return true;
    }

    async resetPassword(token, newPassword) {
        if (!token) throw new Error('Reset token required');
        if (!newPassword || newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters long');
        }

        const cleaned = token.trim();
        const hashed = crypto.createHash('sha256').update(cleaned).digest('hex');

        const admin = await Admin.findOne({
            resetPasswordToken: hashed,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!admin) {
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

        if (!newPassword || newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters long');
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
        const User = require('../../user/data/models/userModel');

        const users = await User.find()
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

        const totalUsers = await User.countDocuments();

        return {
            users: formattedUsers,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: page
        };
    }
}

module.exports = new AdminAuthService();
