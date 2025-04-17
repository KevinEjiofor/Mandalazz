const favoriteService = require('../service/FavoriteService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');

class FavoriteController {
    async addToFavorites(req, res) {
        try {
            const { productId } = req.body;

            if (!productId) {
                return sendErrorResponse(res, 'Product ID is required', 400);
            }

            const favorite = await favoriteService.addToFavorites(req.user.id, productId);


            sendSuccessResponse(res, 'Added to favorites', {
                productId: favorite.product
            });
        } catch (error) {
            console.error('Error adding to favorites:', error);
            sendErrorResponse(res, error.message, 400);
        }
    }

    async removeFromFavorites(req, res) {
        try {
            const { productId } = req.params;

            if (!productId) {
                return sendErrorResponse(res, 'Product ID is required', 400);
            }

            const result = await favoriteService.removeFromFavorites(req.user.id, productId);
            if (!result) {
                return sendErrorResponse(res, 'Favorite not found', 404);
            }

            sendSuccessResponse(res, 'Removed from favorites');
        } catch (error) {
            console.error('Error removing from favorites:', error);
            sendErrorResponse(res, error.message, 400);
        }
    }

    async getUserFavorites(req, res) {
        try {
            const favorites = await favoriteService.getUserFavorites(req.user.id);


            const filtered = favorites.map(fav => ({
                productId: fav.product
            }));

            sendSuccessResponse(res, 'Favorites fetched successfully', filtered);
        } catch (error) {
            console.error('Error fetching favorites:', error);
            sendErrorResponse(res, error.message, 500);
        }
    }
}

module.exports = new FavoriteController();
