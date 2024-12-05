const express = require('express');
const AdminController = require('../admin/controllers/AdminAuthController');

const router = express.Router();


router.post('/login', AdminController.login);
router.post('/create-admin',  AdminController.createAdmin);
router.post('/forgot-password',  AdminController.forgotPassword);
router.post('/validate-reset-pin',  AdminController.validateResetToken);
router.post('/reset-password',  AdminController.resetPassword);
router.post('/logout', AdminController.logout);

module.exports = router;
