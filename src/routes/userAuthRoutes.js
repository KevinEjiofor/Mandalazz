const express = require('express');
const router = express.Router();
const userController = require('../user/controllers/userAuthController');

router.post('/register', userController.createUserController);
router.post('/login', userController.loginUserController);
router.post('/forgot-password', userController.forgotPasswordController);
router.post('/validate-reset-token', userController.validateResetTokenController);
router.post('/reset-password', userController.resetPasswordController);
router.post('/logout', userController.logoutController);

module.exports = router;
