const Notification = require('../model/notificationModel');

class NotificationRepository {

    static async create(notificationData) {
        const notification = new Notification(notificationData);
        return await notification.save();
    }

    static async findAllGeneral() {
        return Notification.find({ userId: null }).sort({ createdAt: -1 });
    }

    static async findRecentGeneral(limit) {
        return Notification.find({ userId: null })
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    static async countUnreadGeneral() {
        return Notification.countDocuments({ userId: null, read: false });
    }

    static async findByType(type) {
        return Notification.find({ userId: null, type }).sort({ createdAt: -1 });
    }

    static async markAsRead(notificationId) {
        return Notification.findByIdAndUpdate(notificationId, { read: true }, { new: true });
    }

    static async markMultipleAsRead(notificationIds) {
        return Notification.updateMany(
            { _id: { $in: notificationIds } },
            { read: true }
        );
    }

    static async deleteById(notificationId) {
        return Notification.findByIdAndDelete(notificationId);
    }

    static async clearAllGeneral() {
        return Notification.deleteMany({ userId: null });
    }
}

module.exports = NotificationRepository;
