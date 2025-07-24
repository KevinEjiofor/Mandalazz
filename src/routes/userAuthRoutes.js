const express = require('express');
const router = express.Router();
const userController = require('../user/controllers/userAuthController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/register', userController.createUser);
router.post('/login', userController.loginUser);
router.post('/forgot-password', userController.forgotPassword);
router.post('/validate-reset-token', userController.validateResetToken);
router.post('/reset-password', userController.resetPassword);
router.post('/logout', userController.logout);
router.post('/verify-email', userController.verifyEmail);
router.post('/resend-verification', userController.resendVerificationEmail);
router.get('/verification-status', authMiddleware, userController.checkEmailVerificationStatus);

router.put('/change-password', authMiddleware, userController.changePassword);

router.get('/profile', authMiddleware, userController.getProfile);
router.get('/profileforuser', authMiddleware, userController.getProfileForUser);
router.put('/profile', authMiddleware, userController.updateProfile);

module.exports = router;