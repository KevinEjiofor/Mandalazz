const NotificationRepository = require('../data/repositories/NotificationRepository');

class NotificationService {

    static async addNotification(type, message, data) {
        return await NotificationRepository.create({ type, message, data });
    }

    static async createNotificationWithAction(type, message, data, action = null, userId = null) {
        return await NotificationRepository.create({ type, message, data, action, userId });
    }

    static async getAllNotifications() {
        return await NotificationRepository.findAllGeneral();
    }

    static async getRecentNotifications(limit = 10) {
        return await NotificationRepository.findRecentGeneral(limit);
    }

    static async getUnreadCount() {
        return await NotificationRepository.countUnreadGeneral();
    }

    static async getNotificationsByType(type) {
        return await NotificationRepository.findByType(type);
    }

    static async markAsRead(notificationId) {
        return await NotificationRepository.markAsRead(notificationId);
    }

    static async markMultipleAsRead(notificationIds) {
        return await NotificationRepository.markMultipleAsRead(notificationIds);
    }

    static async deleteNotification(notificationId) {
        return await NotificationRepository.deleteById(notificationId);
    }

    static async clearAll() {
        return await NotificationRepository.clearAllGeneral();
    }
}

module.exports = NotificationService;
