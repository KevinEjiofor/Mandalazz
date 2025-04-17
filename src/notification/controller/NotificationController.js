const NotificationService = require('../service/NotificationService');
const { sendErrorResponse, sendSuccessResponse } = require('../../utils/respondHandler');

class NotificationController {
    // Add a new notification
    async addNotification(req, res) {
        try {
            const { type, message, data } = req.body;

            if (!type || !message || !data) {
                return sendErrorResponse(res, 'Type, message, and data are required');
            }

            const notification = await NotificationService.addNotification(type, message, data);
            sendSuccessResponse(res, { notification });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    // Get all notifications
    async getAllNotifications(req, res) {
        try {
            const notifications = await NotificationService.getAllNotifications();
            sendSuccessResponse(res, { notifications });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    // Mark a notification as read
    async markAsRead(req, res) {
        try {
            const { notificationId } = req.params;

            if (!notificationId) {
                return sendErrorResponse(res, 'Notification ID is required');
            }

            const updatedNotification = await NotificationService.markAsRead(notificationId);
            if (!updatedNotification) {
                return sendErrorResponse(res, 'Notification not found');
            }

            sendSuccessResponse(res, { updatedNotification });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    // Clear all notifications
    async clearAllNotifications(req, res) {
        try {
            await NotificationService.clearAll();
            sendSuccessResponse(res, { message: 'All notifications cleared' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
}

module.exports = new NotificationController;
