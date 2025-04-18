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

}

module.exports = new RatingController();