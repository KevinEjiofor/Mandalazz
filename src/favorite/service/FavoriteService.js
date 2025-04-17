const favoriteRepository = require('../data/repositories/FavoriteRepository');

class FavoriteService {
     async addToFavorites(userId, productId) {

        const existing = await favoriteRepository.findOne(userId, productId);
        if (existing) {
            throw new Error('Product is already in favorites');
        }
        return await favoriteRepository.createFavorite(userId, productId);
    }

   async removeFromFavorites(userId, productId) {
        return await favoriteRepository.deleteFavorite(userId, productId);
    }

   async getUserFavorites(userId) {
        return await favoriteRepository.findFavoritesByUser(userId);
    }
}

module.exports = new FavoriteService();
