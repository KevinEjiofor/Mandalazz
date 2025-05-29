// repositories/FavoriteRepository.js

const Favorite = require('../model/favoriteModel');

class FavoriteRepository {
    async createFavorite(userId, productId) {
        return await Favorite.create({ user: userId, product: productId });
    }

    async deleteFavorite(userId, productId) {
        return Favorite.findOneAndDelete({ user: userId, product: productId });
    }

    async findFavoritesByUser(userId) {
        return Favorite.find({ user: userId }).populate({
            path: 'product',
            populate: {
                path: 'comments', // If comments are also populated
                model: 'Comment',
            },
        }).lean();
    }

    async findOne(userId, productId) {
        return Favorite.findOne({ user: userId, product: productId });
    }
}

module.exports = new FavoriteRepository();
