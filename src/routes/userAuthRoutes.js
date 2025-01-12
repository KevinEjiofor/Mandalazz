const express = require('express');
const router = express.Router();
const userController = require('../user/controllers/userAuthController');


router.post('/register', userController.createUser);
router.post('/login', userController.loginUser);
router.post('/forgot-password', userController.forgotPassword);
router.post('/validate-reset-token', userController.validateResetToken);
router.post('/reset-password', userController.resetPassword);
router.post('/logout', userController.logout);

module.exports = router;
