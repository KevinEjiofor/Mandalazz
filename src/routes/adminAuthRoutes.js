const express = require('express');
const {
    loginAdmin,
    createAdmin,
    forgotPassword,
    validateResetPin,
    resetPassword,
    logoutUser,
} = require('../admin/controllers/adminAuthController');

const router = express.Router();


router.post('/login', loginAdmin);
router.post('/create-admin', createAdmin);
router.post('/forgot-password', forgotPassword);
router.post('/validate-reset-pin', validateResetPin);
router.post('/reset-password', resetPassword);
router.post('/logout', logoutUser);

module.exports = router;
