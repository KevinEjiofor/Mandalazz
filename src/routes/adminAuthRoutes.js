const express = require('express');
const {
    loginAdminController,
    createAdminController,
    forgotPasswordController,
    validateResetTokenController,
    resetPasswordController,
    logoutUser,
} = require('../admin/controllers/adminAuthController');

const router = express.Router();


router.post('/login', loginAdminController);
router.post('/create-admin', createAdminController);
router.post('/forgot-password', forgotPasswordController);
router.post('/validate-reset-pin', validateResetTokenController);
router.post('/reset-password', resetPasswordController);
router.post('/logout', logoutUser);

module.exports = router;
