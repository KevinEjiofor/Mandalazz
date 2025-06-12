const Cart = require('../models/cartModel');

class CartRepository {
    static async findByUser(userId) {
        return Cart.findOne({ user: userId });
    }

    static async findByGuestId(guestId) {
        return Cart.findOne({ guestId });
    }

    static async createCart(userId = null, guestId = null) {
        return new Cart({ user: userId, guestId, items: [] });
    }

    static async saveCart(cart) {
        return cart.save();
    }

    static async deleteCart(cart) {
        return cart.deleteOne();
    }

    static async getCartWithProducts(userId) {
        return Cart.findOne({ user: userId }).populate('items.product');
    }

    static async getCartWithProductsByGuestId(guestId) {
        return Cart.findOne({ guestId }).populate('items.product');
    }


    static async findCart(userId, guestId) {
        if (userId) {
            return this.findByUser(userId);
        } else if (guestId) {
            return this.findByGuestId(guestId);
        }
        return null;
    }


    static async getCartWithProductsByUserOrGuest(userId, guestId) {
        if (userId) {
            return this.getCartWithProducts(userId);
        } else if (guestId) {
            return this.getCartWithProductsByGuestId(guestId);
        }
        return null;
    }
}

module.exports = CartRepository;