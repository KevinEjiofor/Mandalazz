const express = require('express');
const { loginAdmin, createAdmin, forgotPassword, resetPassword} = require('../admin/controllers/adminAuthController');

const router = express.Router();

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/login', loginAdmin);
router.post('/create-admin', createAdmin);

module.exports = router;
