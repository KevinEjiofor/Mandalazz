const express = require('express');
const NotificationController = require('../notification/controller/NotificationController');
const authMiddleware = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');

const router = express.Router();

router.post('/add', authMiddleware, isAdmin, NotificationController.addNotification);

router.post('/add-with-action', authMiddleware, isAdmin, NotificationController.addNotificationWithAction);

router.get('/all', authMiddleware, isAdmin, NotificationController.getAllNotifications);

router.get('/type/:type', authMiddleware, isAdmin, NotificationController.getNotificationsByType);

router.get('/recent', authMiddleware, isAdmin, NotificationController.getRecentNotifications);

router.get('/unread-count', authMiddleware, isAdmin, NotificationController.getUnreadCount);

router.put('/mark-as-read/:notificationId', authMiddleware, isAdmin, NotificationController.markAsRead);

router.put('/mark-multiple-as-read', authMiddleware, isAdmin, NotificationController.markMultipleAsRead);

router.put('/handle-action/:notificationId', authMiddleware, isAdmin, NotificationController.handleNotificationAction);

router.delete('/delete/:notificationId', authMiddleware, isAdmin, NotificationController.deleteNotification);

router.delete('/clear', authMiddleware, isAdmin, NotificationController.clearAllNotifications);

module.exports = router;