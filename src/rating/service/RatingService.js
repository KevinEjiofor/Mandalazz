const ratingRepo = require('../data/repositories/RatingRepository');
const Product = require('../../product/data/models/productModel');
const User = require('../../user/data/models/userModel');
const { getIO } = require("../../utils/socketHandler");
const NotificationService = require('../../notification/service/NotificationService');

class RatingService {

    async rateProduct(userId, productId, rating, comment) {
        const user = await User.findById(userId, 'firstName lastName email');
        if (!user) throw new Error('User not found');

        const product = await Product.findById(productId, 'name');
        if (!product) throw new Error('Product not found');

        const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
        const userEmail = user?.email || '';

        // Create or update rating document
        const ratingDoc = await ratingRepo.createOrUpdateRating(
            userId,
            productId,
            rating,
            comment,
            userName,
            userEmail
        );

        // Update product's average rating and review count
        const { averageRating, reviewCount } = await ratingRepo.getAverageRating(productId);
        await Product.findByIdAndUpdate(productId, {
            rating: averageRating,
            reviewCount,
        });

        // Populate rating's user field
        const populatedRating = await ratingDoc.populate('user', 'firstName lastName email');

        // Send notifications
        await this._notifyRatingAdded({
            user,
            product,
            rating: populatedRating,
            userName,
            productId,
            comment,
        });

        return {
            rating: populatedRating.rating,
            comment: populatedRating.comment,
            user: {
                userName,
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

    async _notifyRatingAdded({ user, product, rating, userName, productId, comment }) {
        const socket = getIO();
        const message = `${userName} rated product ${product.name} with ${rating.rating} stars`;

        const payload = {
            productId,
            ratingId: rating._id,
            userId: user._id,
            productName: product.name,
            rating: rating.rating,
            comment: comment,
        };

        const action = {
            type: 'navigate',
            url: `/admin/products/${productId}/ratings`,
            params: { productId },
            label: 'View Rating',
        };

        if (socket) {

            socket.emit('ratingAdded', {
                productId,
                rating: {
                    rating: rating.rating,
                    comment: rating.comment,
                    userName,
                    createdAt: rating.createdAt,
                },
            });

            socket.to('adminRoom').emit('adminNotification', {
                type: 'rating_added',
                message,
                data: payload,
                action,
            });
        }

        await NotificationService.addNotification('rating_added', message, payload, action);
    }
}

module.exports = new RatingService();
