const NotificationService = require('../service/NotificationService');
const { sendErrorResponse, sendSuccessResponse } = require('../../utils/respondHandler');

class NotificationController {

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

    async addNotificationWithAction(req, res) {
        try {
            const { type, message, data, action } = req.body;

            if (!type || !message || !data) {
                return sendErrorResponse(res, 'Type, message, and data are required');
            }

            const notification = await NotificationService.createNotificationWithAction(
                type,
                message,
                data,
                action,
                null // null for admin notifications
            );
            sendSuccessResponse(res, { notification });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }


    async getAllNotifications(req, res) {
        try {
            const notifications = await NotificationService.getAllNotifications();
            sendSuccessResponse(res, { notifications });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }


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


    async clearAllNotifications(req, res) {
        try {
            await NotificationService.clearAll();
            sendSuccessResponse(res, { message: 'All notifications cleared' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }


    async getUnreadCount(req, res) {
        try {
            const count = await NotificationService.getUnreadCount();
            sendSuccessResponse(res, { unreadCount: count });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }


    async handleNotificationAction(req, res) {
        try {
            const { notificationId } = req.params;
            const notification = await NotificationService.markAsRead(notificationId);

            if (!notification) {
                return sendErrorResponse(res, 'Notification not found');
            }

            // Return the action data for frontend to handle navigation
            sendSuccessResponse(res, {
                message: 'Notification marked as read',
                action: notification.action
            });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }


    async getNotificationsByType(req, res) {
        try {
            const { type } = req.params;
            const notifications = await NotificationService.getNotificationsByType(type);
            sendSuccessResponse(res, { notifications });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }


    async getRecentNotifications(req, res) {
        try {
            const { limit } = req.query;
            const notifications = await NotificationService.getRecentNotifications(limit ? parseInt(limit) : 10);
            sendSuccessResponse(res, { notifications });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    // NEW: Delete specific notification
    async deleteNotification(req, res) {
        try {
            const { notificationId } = req.params;
            const deletedNotification = await NotificationService.deleteNotification(notificationId);

            if (!deletedNotification) {
                return sendErrorResponse(res, 'Notification not found');
            }

            sendSuccessResponse(res, { message: 'Notification deleted successfully' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }


    async markMultipleAsRead(req, res) {
        try {
            const { notificationIds } = req.body;

            if (!notificationIds || !Array.isArray(notificationIds)) {
                return sendErrorResponse(res, 'Notification IDs array is required');
            }

            await NotificationService.markMultipleAsRead(notificationIds);
            sendSuccessResponse(res, { message: 'Notifications marked as read' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
}

module.exports = new NotificationController();