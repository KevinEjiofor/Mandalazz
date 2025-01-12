const express = require('express');
const AdminController = require('../admin/controllers/AdminAuthController');
const isAdmin = require('../middlewares/isAdmin');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();


router.post('/login', AdminController.login);
router.post('/create-admin',  AdminController.createAdmin);
router.post('/forgot-password',  AdminController.forgotPassword);
router.post('/validate-reset-pin',  AdminController.validateResetToken);
router.post('/reset-password',  AdminController.resetPassword);
router.post('/logout', AdminController.logout);
router.get('/users/overview',authMiddleware,isAdmin, AdminController.getUserOverviews);

module.exports = router;
