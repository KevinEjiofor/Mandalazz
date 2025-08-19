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
    formatDateTime(date) {
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC'
        };
        return date.toLocaleDateString('en-US', options);
    }

    getClientInfo(req) {
        let ip = 'Unknown';

        if (req) {
            ip = req.headers['x-forwarded-for'] ||
                req.headers['x-real-ip'] ||
                req.headers['x-client-ip'] ||
                req.headers['cf-connecting-ip'] ||
                req.connection?.remoteAddress ||
                req.socket?.remoteAddress ||
                req.ip ||
                req.raw?.connection?.remoteAddress ||
                'Unknown';

            if (ip && ip.includes(',')) {
                ip = ip.split(',')[0].trim();
            }

            if (ip && ip.startsWith('::ffff:')) {
                ip = ip.substring(7);
            }
        }

        const userAgent = req?.get ? req.get('User-Agent') : req?.headers?.['user-agent'] || 'Unknown';

        return { ip, userAgent };
    }

    async getLocationFromIP(ip) {
        if (!ip || ip === 'Unknown' || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
            return 'Local/Private Network';
        }

        try {
            const response = await fetch(`http://ipapi.co/${ip}/json/`, {
                timeout: 3000
            });

            if (response.ok) {
                const data = await response.json();
                if (data.city && data.country_name) {
                    return `${data.city}, ${data.country_name}`;
                } else if (data.country_name) {
                    return data.country_name;
                }
            }
        } catch (error) {
            // Silent fail for location detection
        }

        return 'Unknown Location';
    }

    async authenticateAdmin(email, password, req = null) {
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

        const clientInfo = this.getClientInfo(req);
        const location = await this.getLocationFromIP(clientInfo.ip);
        const loginTime = this.formatDateTime(new Date());

        const subject = 'Admin Login Alert';
        const text = `Hi ${admin.name},

New admin login detected:

Time: ${loginTime}
IP: ${clientInfo.ip}
Location: ${location}
Device: ${clientInfo.userAgent}

If this wasn't you, change your password immediately and contact security@yourcompany.com.

Stay secure,
Security Team`;

        await userNotifications(email, subject, text);

        return token;
    }

    async createAdminAccount(name, email, password) {
        await checkIfAdminExists(name, email);

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = await createAdmin(name, email, hashedPassword);

        const creationTime = this.formatDateTime(new Date());

        const subject = 'Admin Account Created';
        const text = `Welcome ${name}!

Your admin account is ready:

Email: ${email}
Created: ${creationTime}
Login: https://yourcompany.com/admin

Security tips:
• Use a strong password
• Enable 2FA when available
• Never share your credentials

Need help? Contact support@yourcompany.com

Welcome aboard!
Admin Team`;

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

        const requestTime = this.formatDateTime(new Date());

        const subject = 'Password Reset Request';
        const text = `Hi ${admin.name},

Password reset requested for ${email}

Reset Token: ${rawResetToken}
Requested: ${requestTime}
Expires: 10 minutes

Use this token to reset your password. Keep it secure!

Didn't request this? Ignore this email.

Security Team`;

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

        const resetTime = this.formatDateTime(new Date());

        const subject = 'Password Reset Complete';
        const confirmationText = `Hi ${admin.name},

Your password was successfully reset.

Account: ${admin.email}
Reset: ${resetTime}

Login with your new password at: https://yourcompany.com/admin

If you didn't do this, contact security@yourcompany.com immediately.

Security Team`;

        await userNotifications(admin.email, subject, confirmationText);

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

        const changeTime = this.formatDateTime(new Date());

        const subject = 'Password Changed';
        const text = `Hi ${admin.name},

Your admin password was changed successfully.

Account: ${admin.email}
Changed: ${changeTime}

If you didn't make this change, contact security@yourcompany.com immediately.

Security Team`;

        await userNotifications(admin.email, subject, text);

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