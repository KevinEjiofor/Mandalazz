const Rating = require('../models/ratingModel');

class RatingRepository {

    async createOrUpdateRating(userId, productId, ratingValue, comment, userName, userEmail) {
        return Rating.findOneAndUpdate(
            { user: userId, product: productId },
            {
                rating: ratingValue,
                comment,
                userName,
                userEmail
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
    }

    async getRatingsByProduct(productId) {
        return Rating.find({ product: productId }).populate('user', 'firstName lastName email');
    }

    async getAverageRating(productId) {
        const result = await Rating.aggregate([
            { $match: { product: productId } },
            {
                $group: {
                    _id: '$product',
                    averageRating: { $avg: '$rating' },
                    reviewCount: { $sum: 1 },
                },
            },
        ]);

        return result[0] || { averageRating: 0, reviewCount: 0 };
    }

    async getRatingById(ratingId) {
        return Rating.findById(ratingId).populate('user', 'firstName lastName email');
    }

    async deleteRating(ratingId) {
        return Rating.findByIdAndDelete(ratingId);
    }
}

module.exports = new RatingRepository();