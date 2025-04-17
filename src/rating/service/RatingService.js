const ratingRepo = require('../data/repositories/RatingRepository');
const Product = require('../../product/data/models/productModel');
const User = require('../../user/data/models/userModel');
const { getIO } = require("../../utils/socketHandler");
const Rating = require('../data/models/ratingModel');
const NotificationService = require('../../notification/service/NotificationService');

class RatingService {
    async rateProduct(userId, productId, rating, comment) {
        // Get user data
        const user = await User.findById(userId, 'firstName lastName email');
        if (!user) throw new Error('User not found');

        // Get product data
        const product = await Product.findById(productId, 'name');
        if (!product) throw new Error('Product not found');

        // Format the user's name
        const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
        const userEmail = user?.email || '';

        // Create or update the rating with the user's name and email
        const ratingDoc = await ratingRepo.createOrUpdateRating(
            userId,
            productId,
            rating,
            comment,
            userName,
            userEmail
        );

        const { averageRating, reviewCount } = await ratingRepo.getAverageRating(productId);

        await Product.findByIdAndUpdate(productId, {
            rating: averageRating,
            reviewCount,
        });

        // Populate the user reference
        const populatedRating = await ratingDoc.populate('user', 'firstName lastName email');

        // Send socket notification
        const socket = getIO();
        if (socket) {
            // Emit to all users viewing the product
            socket.emit('ratingAdded', {
                productId,
                rating: {
                    rating: populatedRating.rating,
                    comment: populatedRating.comment,
                    userName: userName,
                    createdAt: populatedRating.createdAt,
                },
            });

            // Send to admin room for notifications
            socket.to('adminRoom').emit('adminNotification', {
                type: 'rating_added',
                message: `${userName} rated product ${product.name} with ${rating} stars`,
                data: {
                    productId,
                    ratingId: populatedRating._id,
                    userId,
                    productName: product.name,
                    rating: rating,
                    comment: comment,
                }
            });
        }

        // Create a persistent notification for admin
        await NotificationService.addNotification(
            'rating_added',
            `${userName} rated product ${product.name} with ${rating} stars`,
            {
                productId,
                ratingId: populatedRating._id,
                userId,
                productName: product.name,
                rating: rating,
                comment: comment,
            }
        );

        return {
            rating: populatedRating.rating,
            comment: populatedRating.comment,
            user: {
                userName: userName,
                email: userEmail,
            },
            createdAt: populatedRating.createdAt,
            averageRating,
            reviewCount,
        };
    }

    async getProductRatings(productId) {
        const ratings = await ratingRepo.getRatingsByProduct(productId);

        return ratings.map(r => ({
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            user: {
                userName: r.userName || `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim(),
                email: r.userEmail || r.user?.email || '',
            },
        }));
    }

    // Add method to update a rating with notification
    async updateRating(userId, productId, ratingId, newRating, newComment, isAdmin) {
        console.log('Request body:', req.body);
        console.log('Product ID:', req.params.productId);
        console.log('Rating ID:', req.params.ratingId);

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const product = await Product.findById(productId);
        if (!product) throw new Error('Product not found');

        // Find the rating
        const rating = await Rating.findById(ratingId);
        if (!rating) throw new Error('Rating not found');

        // Check if user is authorized to update
        if (rating.user.toString() !== userId && !isAdmin) {
            throw new Error('Unauthorized to update this rating');
        }

        // Update the rating
        rating.rating = newRating;
        rating.comment = newComment;
        await rating.save();

        // Update product average rating
        const { averageRating, reviewCount } = await ratingRepo.getAverageRating(productId);
        await Product.findByIdAndUpdate(productId, {
            rating: averageRating,
            reviewCount,
        });

        // Send socket notification for update
        const socket = getIO();
        if (socket) {
            socket.emit('ratingUpdated', {
                productId,
                ratingId,
                rating: {
                    rating: newRating,
                    comment: newComment,
                    updatedAt: new Date(),
                }
            });

            // Only notify admin if update wasn't by admin
            if (!isAdmin) {
                socket.to('adminRoom').emit('adminNotification', {
                    type: 'rating_updated',
                    message: `${user.firstName} ${user.lastName} updated their rating for product ${product.name}`,
                    data: {
                        productId,
                        ratingId,
                        userId,
                        productName: product.name,
                        newRating,
                        newComment
                    }
                });

                // Create persistent notification
                await NotificationService.addNotification(
                    'rating_updated',
                    `${user.firstName} ${user.lastName} updated their rating for product ${product.name}`,
                    {
                        productId,
                        ratingId,
                        userId,
                        productName: product.name,
                        newRating,
                        newComment
                    }
                );
            }
        }

        return {
            rating: newRating,
            comment: newComment,
            user: {
                userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                email: user.email || '',
            },
            updatedAt: new Date(),
            averageRating,
            reviewCount,
        };
    }

    // Add method to delete a rating with notification
    async deleteRating(userId, productId, ratingId, isAdmin) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const product = await Product.findById(productId);
        if (!product) throw new Error('Product not found');

        // Find the rating
        const rating = await Rating.findById(ratingId);
        if (!rating) throw new Error('Rating not found');

        // Check if user is authorized to delete
        if (rating.user.toString() !== userId && !isAdmin) {
            throw new Error('Unauthorized to delete this rating');
        }

        // Delete the rating
        await Rating.findByIdAndDelete(ratingId);

        // Update product average rating
        const { averageRating, reviewCount } = await ratingRepo.getAverageRating(productId);
        await Product.findByIdAndUpdate(productId, {
            rating: averageRating,
            reviewCount,
        });

        // Send socket notification for deletion
        const socket = getIO();
        if (socket) {
            socket.emit('ratingDeleted', {
                productId,
                ratingId,
                user: {
                    firstName: user.firstName,
                    lastName: user.lastName
                }
            });

            // Only notify admin if deletion wasn't by admin
            if (!isAdmin) {
                socket.to('adminRoom').emit('adminNotification', {
                    type: 'rating_deleted',
                    message: `${user.firstName} ${user.lastName} deleted their rating for product ${product.name}`,
                    data: {
                        productId,
                        ratingId,
                        userId,
                        productName: product.name
                    }
                });

                // Create persistent notification
                await NotificationService.addNotification(
                    'rating_deleted',
                    `${user.firstName} ${user.lastName} deleted their rating for product ${product.name}`,
                    {
                        productId,
                        ratingId,
                        userId,
                        productName: product.name
                    }
                );
            }
        }

        return {
            deleted: true,
            averageRating,
            reviewCount
        };
    }
}

module.exports = new RatingService();