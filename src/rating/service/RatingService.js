const ratingRepo = require('../data/repositories/RatingRepository');
const Product = require('../../product/data/models/productModel');
const User = require('../../user/data/models/userModel');
const { getIO } = require("../../utils/socketHandler");
const Rating = require('../data/models/ratingModel');
const NotificationService = require('../../notification/service/NotificationService');

class RatingService {
    async rateProduct(userId, productId, rating, comment) {

        const user = await User.findById(userId, 'firstName lastName email');
        if (!user) throw new Error('User not found');

        const product = await Product.findById(productId, 'name');
        if (!product) throw new Error('Product not found');


        const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
        const userEmail = user?.email || '';


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


        const populatedRating = await ratingDoc.populate('user', 'firstName lastName email');


        const socket = getIO();
        if (socket) {

            socket.emit('ratingAdded', {
                productId,
                rating: {
                    rating: populatedRating.rating,
                    comment: populatedRating.comment,
                    userName: userName,
                    createdAt: populatedRating.createdAt,
                },
            });


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

}

module.exports = new RatingService();