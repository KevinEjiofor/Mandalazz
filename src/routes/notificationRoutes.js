const express = require('express');
const NotificationController = require('../notification/controller/NotificationController');
const authMiddleware = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');

const router = express.Router();

// Route to add a new notification
router.post('/add', authMiddleware, isAdmin, NotificationController.addNotification);

// Route to get all notifications
router.get('/all', authMiddleware, isAdmin,NotificationController.getAllNotifications);

// Route to mark a notification as read
router.put('/mark-as-read/:notificationId', authMiddleware, isAdmin, NotificationController.markAsRead);

// Route to clear all notifications
router.delete('/clear', authMiddleware,isAdmin, NotificationController.clearAllNotifications);

module.exports = router;
