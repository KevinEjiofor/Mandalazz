const Notification = require('../data/model/notificationModel');

class NotificationService {
    static async addNotification(type, message, data) {
        const notification = new Notification({ type, message, data });
        return await notification.save();
    }

    static async getAllNotifications() {
        return await Notification.find().sort({ createdAt: -1 });
    }

    static async markAsRead(notificationId) {
        return await Notification.findByIdAndUpdate(notificationId, { read: true }, { new: true });
    }

    static async clearAll() {
        return await Notification.deleteMany({});
    }
}

module.exports = NotificationService;
