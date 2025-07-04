const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserService = require('../../src/user/services/UserService');
const UserRepository = require('../../src/user/data/repositories/UserRepository');
const { checkIfUserExists } = require('../../src/utils/validation');
const { sendEmail } = require('../../src/utils/emailHandler');
const { generateResetToken } = require('../../src/utils/tokenGenerator');
const CartService = require('../../src/cart/services/CartService');
const RecentViewService = require('../../src/recentView/services/RecentViewService');

// Mock all dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../src/user/data/repositories/UserRepository');
jest.mock('../../src/utils/validation');
jest.mock('../../src/utils/emailHandler');
jest.mock('../../src/utils/tokenGenerator');
jest.mock('../../src/cart/services/CartService');
jest.mock('../../src/recentView/services/RecentViewService');

describe('UserService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';
    });

    describe('authenticateUser', () => {
        const mockUser = {
            _id: 'user123',
            email: 'test@example.com',
            password: 'hashedPassword',
            role: 'user'
        };

        it('should authenticate user successfully without guestId', async () => {
            UserRepository.getUserByEmail.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('jwt-token');

            const result = await UserService.authenticateUser('test@example.com', 'password');

            expect(UserRepository.getUserByEmail).toHaveBeenCalledWith('test@example.com');
            expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
            expect(jwt.sign).toHaveBeenCalledWith(
                { id: 'user123', role: 'user' },
                'test-secret',
                { expiresIn: '5h' }
            );
            expect(result).toBe('jwt-token');
        });

        it('should authenticate user successfully with guestId', async () => {
            UserRepository.getUserByEmail.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('jwt-token');
            UserService.handleUserSessionData = jest.fn();

            const result = await UserService.authenticateUser('test@example.com', 'password', 'guest123');

            expect(UserService.handleUserSessionData).toHaveBeenCalledWith('user123', 'guest123');
            expect(result).toBe('jwt-token');
        });

        it('should throw error when user not found', async () => {
            UserRepository.getUserByEmail.mockResolvedValue(null);

            await expect(
                UserService.authenticateUser('test@example.com', 'password')
            ).rejects.toThrow('Invalid email or password');
        });

        it('should throw error when password is incorrect', async () => {
            UserRepository.getUserByEmail.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);

            await expect(
                UserService.authenticateUser('test@example.com', 'wrongpassword')
            ).rejects.toThrow('Invalid email or password');
        });
    });

    describe('createUserAccount', () => {
        const mockUser = {
            _id: 'user123',
            firstName: 'John',
            email: 'test@example.com',
            save: jest.fn()
        };

        beforeEach(() => {
            checkIfUserExists.mockResolvedValue(true);
            bcrypt.hash.mockResolvedValue('hashedPassword');
            generateResetToken.mockReturnValue('verification-token');
            UserRepository.createUser.mockResolvedValue(mockUser);
            sendEmail.mockResolvedValue(true);
            Date.now = jest.fn(() => 1234567890000);
        });

        it('should create user account successfully', async () => {
            const result = await UserService.createUserAccount('John', 'Doe', 'test@example.com', 'password');

            expect(checkIfUserExists).toHaveBeenCalledWith('test@example.com');
            expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
            expect(generateResetToken).toHaveBeenCalled();
            expect(UserRepository.createUser).toHaveBeenCalledWith('John', 'Doe', 'test@example.com', 'hashedPassword');
            expect(mockUser.emailVerificationToken).toBe('verification-token');
            expect(mockUser.emailVerificationExpire).toBe(1234567890000 + 30 * 60 * 1000);
            expect(mockUser.save).toHaveBeenCalled();
            expect(sendEmail).toHaveBeenCalledWith(
                'test@example.com',
                'Welcome to Our Platform',
                'Hi John,\n\nWelcome! Verify your email using this code: verification-token (expires in 30 mins).'
            );
            expect(result).toBe(mockUser);
        });

        it('should throw error if user already exists', async () => {
            checkIfUserExists.mockRejectedValue(new Error('User already exists'));

            await expect(
                UserService.createUserAccount('John', 'Doe', 'test@example.com', 'password')
            ).rejects.toThrow('User already exists');
        });
    });

    describe('verifyEmail', () => {
        const mockUser = {
            emailVerified: false,
            emailVerificationToken: 'valid-token',
            emailVerificationExpire: Date.now() + 10000,
            save: jest.fn()
        };

        it('should verify email successfully', async () => {
            UserRepository.getUserByEmail.mockResolvedValue(mockUser);

            const result = await UserService.verifyEmail('test@example.com', 'valid-token');

            expect(UserRepository.getUserByEmail).toHaveBeenCalledWith('test@example.com');
            expect(mockUser.emailVerified).toBe(true);
            expect(mockUser.emailVerificationToken).toBe(null);
            expect(mockUser.emailVerificationExpire).toBe(null);
            expect(mockUser.save).toHaveBeenCalled();
            expect(result).toBe(mockUser);
        });

        it('should throw error when user not found', async () => {
            UserRepository.getUserByEmail.mockResolvedValue(null);

            await expect(
                UserService.verifyEmail('test@example.com', 'token')
            ).rejects.toThrow('Invalid operation');
        });

        it('should throw error when email already verified', async () => {
            const verifiedUser = { ...mockUser, emailVerified: true };
            UserRepository.getUserByEmail.mockResolvedValue(verifiedUser);

            await expect(
                UserService.verifyEmail('test@example.com', 'token')
            ).rejects.toThrow('Invalid operation');
        });

        it('should throw error when token is invalid', async () => {
            const mockUserWithValidToken = { ...mockUser };
            UserRepository.getUserByEmail.mockResolvedValue(mockUserWithValidToken);

            await expect(
                UserService.verifyEmail('test@example.com', 'invalid-token')
            ).rejects.toThrow('Invalid or expired verification token');
        });

        it('should throw error when token is expired', async () => {
            const expiredUser = {
                ...mockUser,
                emailVerificationExpire: Date.now() - 10000
            };
            UserRepository.getUserByEmail.mockResolvedValue(expiredUser);

            await expect(
                UserService.verifyEmail('test@example.com', 'valid-token')
            ).rejects.toThrow('Invalid or expired verification token');
        });
    });

    describe('resendVerificationEmail', () => {
        const mockUser = {
            firstName: 'John',
            emailVerified: false,
            save: jest.fn()
        };

        beforeEach(() => {
            generateResetToken.mockReturnValue('new-token');
            Date.now = jest.fn(() => 1234567890000);
            sendEmail.mockResolvedValue(true);
        });

        it('should resend verification email successfully', async () => {
            UserRepository.getUserByEmail.mockResolvedValue(mockUser);

            const result = await UserService.resendVerificationEmail('test@example.com');

            expect(UserRepository.getUserByEmail).toHaveBeenCalledWith('test@example.com');
            expect(generateResetToken).toHaveBeenCalled();
            expect(mockUser.emailVerificationToken).toBe('new-token');
            expect(mockUser.emailVerificationExpire).toBe(1234567890000 + 30 * 60 * 1000);
            expect(mockUser.save).toHaveBeenCalled();
            expect(sendEmail).toHaveBeenCalledWith(
                'test@example.com',
                'Email Verification',
                'Hi John,\n\nUse this code to verify your email: new-token (expires in 30 mins).'
            );
            expect(result).toBe(true);
        });

        it('should throw error when user not found', async () => {
            UserRepository.getUserByEmail.mockResolvedValue(null);

            await expect(
                UserService.resendVerificationEmail('test@example.com')
            ).rejects.toThrow('Invalid operation');
        });

        it('should throw error when email already verified', async () => {
            const verifiedUser = { ...mockUser, emailVerified: true };
            UserRepository.getUserByEmail.mockResolvedValue(verifiedUser);

            await expect(
                UserService.resendVerificationEmail('test@example.com')
            ).rejects.toThrow('Invalid operation');
        });
    });

    describe('checkEmailVerificationStatus', () => {
        const mockUser = {
            emailVerified: true,
            email: 'test@example.com'
        };

        it('should return verification status successfully', async () => {
            UserRepository.findUserById.mockResolvedValue(mockUser);

            const result = await UserService.checkEmailVerificationStatus('user123');

            expect(UserRepository.findUserById).toHaveBeenCalledWith('user123');
            expect(result).toEqual({
                verified: true,
                email: 'test@example.com'
            });
        });

        it('should throw error when user not found', async () => {
            UserRepository.findUserById.mockResolvedValue(null);

            await expect(
                UserService.checkEmailVerificationStatus('user123')
            ).rejects.toThrow('User not found');
        });
    });

    describe('forgotPassword', () => {
        const mockUser = {
            firstName: 'John',
            save: jest.fn()
        };

        beforeEach(() => {
            generateResetToken.mockReturnValue('reset-pin');
            Date.now = jest.fn(() => 1234567890000);
            sendEmail.mockResolvedValue(true);
        });

        it('should initiate forgot password successfully', async () => {
            UserRepository.getUserByEmail.mockResolvedValue(mockUser);

            const result = await UserService.forgotPassword('test@example.com');

            expect(UserRepository.getUserByEmail).toHaveBeenCalledWith('test@example.com');
            expect(generateResetToken).toHaveBeenCalled();
            expect(mockUser.resetPasswordPin).toBe('reset-pin');
            expect(mockUser.resetPasswordExpire).toBe(1234567890000 + 10 * 60 * 1000);
            expect(mockUser.save).toHaveBeenCalled();
            expect(sendEmail).toHaveBeenCalledWith(
                'test@example.com',
                'Password Reset PIN',
                'Hi John,\n\nYour password reset PIN is reset-pin (expires in 10 mins).'
            );
            expect(result).toBe('reset-pin');
        });

        it('should throw error when user not found', async () => {
            UserRepository.getUserByEmail.mockResolvedValue(null);

            await expect(
                UserService.forgotPassword('test@example.com')
            ).rejects.toThrow('No user found with this email');
        });
    });

    describe('validateResetToken', () => {
        it('should validate reset token successfully', async () => {
            const mockUser = {
                resetPasswordPin: 'valid-pin',
                resetPasswordExpire: Date.now() + 10000
            };
            UserRepository.getUserByEmail.mockResolvedValue(mockUser);

            const result = await UserService.validateResetToken('test@example.com', 'valid-pin');

            expect(UserRepository.getUserByEmail).toHaveBeenCalledWith('test@example.com');
            expect(result).toBe(true);
        });

        it('should throw error when user not found', async () => {
            UserRepository.getUserByEmail.mockResolvedValue(null);

            await expect(
                UserService.validateResetToken('test@example.com', 'pin')
            ).rejects.toThrow('Invalid or expired reset token');
        });

        it('should throw error when pin is invalid', async () => {
            const mockUser = {
                resetPasswordPin: 'valid-pin',
                resetPasswordExpire: Date.now() + 10000
            };
            UserRepository.getUserByEmail.mockResolvedValue(mockUser);

            await expect(
                UserService.validateResetToken('test@example.com', 'invalid-pin')
            ).rejects.toThrow('Invalid or expired reset token');
        });

        it('should throw error when token is expired', async () => {
            const mockUser = {
                resetPasswordPin: 'valid-pin',
                resetPasswordExpire: Date.now() - 10000
            };
            UserRepository.getUserByEmail.mockResolvedValue(mockUser);

            await expect(
                UserService.validateResetToken('test@example.com', 'valid-pin')
            ).rejects.toThrow('Invalid or expired reset token');
        });
    });

    describe('resetPassword', () => {
        const mockUser = {
            resetPasswordPin: 'valid-pin',
            resetPasswordExpire: Date.now() + 10000,
            save: jest.fn()
        };

        beforeEach(() => {
            bcrypt.hash.mockResolvedValue('new-hashed-password');
        });

        it('should reset password successfully', async () => {
            UserRepository.getUserByEmail.mockResolvedValue(mockUser);

            const result = await UserService.resetPassword('test@example.com', 'valid-pin', 'newpassword');

            expect(UserRepository.getUserByEmail).toHaveBeenCalledWith('test@example.com');
            expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
            expect(mockUser.password).toBe('new-hashed-password');
            expect(mockUser.resetPasswordPin).toBe(undefined);
            expect(mockUser.resetPasswordExpire).toBe(undefined);
            expect(mockUser.save).toHaveBeenCalled();
            expect(result).toBe(mockUser);
        });

        it('should throw error when user not found', async () => {
            UserRepository.getUserByEmail.mockResolvedValue(null);

            await expect(
                UserService.resetPassword('test@example.com', 'pin', 'newpassword')
            ).rejects.toThrow('Invalid or expired reset token');
        });

        it('should throw error when pin is invalid', async () => {
            UserRepository.getUserByEmail.mockResolvedValue(mockUser);

            await expect(
                UserService.resetPassword('test@example.com', 'invalid-pin', 'newpassword')
            ).rejects.toThrow('Invalid or expired reset token');
        });
    });

    describe('handleUserSessionData', () => {
        beforeEach(() => {
            // Reset console.error mock before each test
            console.error = jest.fn();
        });

        it('should handle session data successfully', async () => {
            CartService.mergeGuestCartWithUserCart.mockResolvedValue(true);
            RecentViewService.mergeGuestRecentViewsWithUser.mockResolvedValue(true);

            await UserService.handleUserSessionData('user123', 'guest456');

            expect(CartService.mergeGuestCartWithUserCart).toHaveBeenCalledWith('guest456', 'user123');
            expect(RecentViewService.mergeGuestRecentViewsWithUser).toHaveBeenCalledWith('guest456', 'user123');
            expect(console.error).not.toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            const error = new Error('Merge failed');
            CartService.mergeGuestCartWithUserCart.mockRejectedValue(error);
            RecentViewService.mergeGuestRecentViewsWithUser.mockResolvedValue(true);

            await UserService.handleUserSessionData('user123', 'guest456');

            expect(CartService.mergeGuestCartWithUserCart).toHaveBeenCalledWith('guest456', 'user123');
            expect(console.error).toHaveBeenCalledWith('❌ Error merging session data for user user123:', error);
        });

        it('should not process when guestId is not provided', async () => {
            await UserService.handleUserSessionData('user123', null);

            expect(CartService.mergeGuestCartWithUserCart).not.toHaveBeenCalled();
            expect(RecentViewService.mergeGuestRecentViewsWithUser).not.toHaveBeenCalled();
        });

        it('should not process when guestId is undefined', async () => {
            await UserService.handleUserSessionData('user123', undefined);

            expect(CartService.mergeGuestCartWithUserCart).not.toHaveBeenCalled();
            expect(RecentViewService.mergeGuestRecentViewsWithUser).not.toHaveBeenCalled();
        });

        it('should not process when guestId is empty string', async () => {
            await UserService.handleUserSessionData('user123', '');

            expect(CartService.mergeGuestCartWithUserCart).not.toHaveBeenCalled();
            expect(RecentViewService.mergeGuestRecentViewsWithUser).not.toHaveBeenCalled();
        });
    });

    describe('updateUserProfile', () => {
        const mockUser = { _id: 'user123', email: 'old@example.com' };

        beforeEach(() => {
            UserRepository.updateUserProfile.mockResolvedValue(mockUser);
            UserRepository.logUserActivity.mockResolvedValue(true);
        });

        it('should update user profile successfully', async () => {
            const updateData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'new@example.com',
                phoneNumber: '1234567890',
                alternateNumber: '0987654321'
            };

            UserRepository.checkEmailExists.mockResolvedValue(false);

            const result = await UserService.updateUserProfile('user123', updateData);

            expect(UserRepository.checkEmailExists).toHaveBeenCalledWith('new@example.com', 'user123');
            expect(UserRepository.updateUserProfile).toHaveBeenCalledWith('user123', {
                firstName: 'John',
                lastName: 'Doe',
                email: 'new@example.com',
                phoneNumber: '1234567890',
                alternateNumber: '0987654321',
                emailVerified: false
            });
            expect(UserRepository.logUserActivity).toHaveBeenCalledWith('user123', 'Profile updated');
            expect(result).toBe(mockUser);
        });

        it('should throw error when email already exists', async () => {
            const updateData = { email: 'existing@example.com' };
            UserRepository.checkEmailExists.mockResolvedValue(true);

            await expect(
                UserService.updateUserProfile('user123', updateData)
            ).rejects.toThrow('Email already exists');

            expect(UserRepository.updateUserProfile).not.toHaveBeenCalled();
        });

        it('should throw error when no valid fields provided', async () => {
            const updateData = {};

            await expect(
                UserService.updateUserProfile('user123', updateData)
            ).rejects.toThrow('No valid fields provided for update');

            expect(UserRepository.updateUserProfile).not.toHaveBeenCalled();
        });

        it('should handle empty string values correctly', async () => {
            const updateData = {
                firstName: '  ',
                phoneNumber: '',
                alternateNumber: ''
            };

            await expect(
                UserService.updateUserProfile('user123', updateData)
            ).rejects.toThrow('No valid fields provided for update');

            expect(UserRepository.updateUserProfile).not.toHaveBeenCalled();
        });

        it('should update profile without changing email verification if email unchanged', async () => {
            const updateData = {
                firstName: 'John',
                lastName: 'Doe',
                phoneNumber: '1234567890'
            };

            const result = await UserService.updateUserProfile('user123', updateData);

            expect(UserRepository.checkEmailExists).not.toHaveBeenCalled();
            expect(UserRepository.updateUserProfile).toHaveBeenCalledWith('user123', {
                firstName: 'John',
                lastName: 'Doe',
                phoneNumber: '1234567890'
            });
            expect(result).toBe(mockUser);
        });
    });

    describe('getUserProfile', () => {
        const mockUser = { _id: 'user123', firstName: 'John' };

        it('should get user profile successfully', async () => {
            UserRepository.findUserById.mockResolvedValue(mockUser);

            const result = await UserService.getUserProfile('user123');

            expect(UserRepository.findUserById).toHaveBeenCalledWith('user123');
            expect(result).toBe(mockUser);
        });

        it('should throw error when user not found', async () => {
            UserRepository.findUserById.mockResolvedValue(null);

            await expect(
                UserService.getUserProfile('user123')
            ).rejects.toThrow('User not found');
        });
    });

    describe('getUserProfileForUser', () => {
        const mockUser = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'test@example.com',
            phoneNumber: '1234567890',
            alternateNumber: '0987654321',
            emailVerified: true,
            role: 'user',
            createdAt: new Date()
        };

        it('should get user profile for user successfully', async () => {
            UserRepository.findUserById.mockResolvedValue(mockUser);

            const result = await UserService.getUserProfileForUser('user123');

            expect(UserRepository.findUserById).toHaveBeenCalledWith('user123');
            expect(result).toEqual({
                firstName: 'John',
                lastName: 'Doe',
                email: 'test@example.com',
                phoneNumber: '1234567890',
                alternateNumber: '0987654321',
                emailVerified: true,
                role: 'user',
                memberSince: mockUser.createdAt
            });
        });

        it('should handle null phone numbers', async () => {
            const userWithoutPhone = { ...mockUser, phoneNumber: undefined, alternateNumber: undefined };
            UserRepository.findUserById.mockResolvedValue(userWithoutPhone);

            const result = await UserService.getUserProfileForUser('user123');

            expect(result.phoneNumber).toBe(null);
            expect(result.alternateNumber).toBe(null);
        });

        it('should throw error when user not found', async () => {
            UserRepository.findUserById.mockResolvedValue(null);

            await expect(
                UserService.getUserProfileForUser('user123')
            ).rejects.toThrow('User not found');
        });
    });

    describe('getUserByEmail', () => {
        it('should get user by email successfully', async () => {
            const mockUser = { email: 'test@example.com' };
            UserRepository.getUserByEmail.mockResolvedValue(mockUser);

            const result = await UserService.getUserByEmail('test@example.com');

            expect(UserRepository.getUserByEmail).toHaveBeenCalledWith('test@example.com');
            expect(result).toBe(mockUser);
        });
    });

    describe('logUserActivity', () => {
        it('should log user activity successfully', async () => {
            UserRepository.logUserActivity.mockResolvedValue(true);

            const result = await UserService.logUserActivity('user123', 'login');

            expect(UserRepository.logUserActivity).toHaveBeenCalledWith('user123', 'login');
            expect(result).toBe(true);
        });
    });

    describe('getUserActivityLogs', () => {
        it('should get user activity logs successfully', async () => {
            const mockLogs = [{ action: 'login', timestamp: new Date() }];
            UserRepository.getUserActivityLogs.mockResolvedValue(mockLogs);

            const result = await UserService.getUserActivityLogs('user123');

            expect(UserRepository.getUserActivityLogs).toHaveBeenCalledWith('user123');
            expect(result).toBe(mockLogs);
        });
    });
});