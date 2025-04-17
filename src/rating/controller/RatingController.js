const ratingService = require('../service/RatingService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');

class RatingController {
    async rateProduct(req, res) {
        try {
            const { rating, comment } = req.body;
            const { productId } = req.params;

            if (!rating || rating < 1 || rating > 5) {
                return sendErrorResponse(res, 'Rating must be between 1 and 5', 400);
            }

            const result = await ratingService.rateProduct(req.user.id, productId, rating, comment);
            sendSuccessResponse(res, 'Rating submitted successfully', result);
        } catch (err) {
            console.error('Rating error:', err);
            sendErrorResponse(res, err.message, 500);
        }
    }

    async getProductRatings(req, res) {
        try {
            const { productId } = req.params;
            const ratings = await ratingService.getProductRatings(productId);
            sendSuccessResponse(res, 'Ratings fetched successfully', ratings);
        } catch (err) {
            sendErrorResponse(res, err.message, 500);
        }
    }

    async updateRating(req, res) {
        try {
            const { productId, ratingId } = req.params;
            const { rating, comment } = req.body;
            const isAdmin = req.user.role === 'admin';

            if (!rating || rating < 1 || rating > 5) {
                return sendErrorResponse(res, 'Rating must be between 1 and 5', 400);
            }

            const result = await ratingService.updateRating(
                req.user.id,
                productId,
                ratingId,
                rating,
                comment,
                isAdmin
            );

            sendSuccessResponse(res, 'Rating updated successfully', result);
        } catch (err) {
            console.error('Update rating error:', err);
            sendErrorResponse(res, err.message, err.message.includes('Unauthorized') ? 403 : 500);
        }
    }

    async deleteRating(req, res) {
        try {
            const { productId, ratingId } = req.params;
            const isAdmin = req.user.role === 'admin';

            const result = await ratingService.deleteRating(
                req.user.id,
                productId,
                ratingId,
                isAdmin
            );

            sendSuccessResponse(res, 'Rating deleted successfully', result);
        } catch (err) {
            console.error('Delete rating error:', err);
            sendErrorResponse(res, err.message, err.message.includes('Unauthorized') ? 403 : 500);
        }
    }
}

module.exports = new RatingController();