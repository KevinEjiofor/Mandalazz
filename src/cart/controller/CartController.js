const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');
const CartService = require('../services/CartService');

class CartController {
    static async addToCart(req, res) {
        try {
            const { productId, quantity, color, size } = req.body;

            const userId = req.user?.id || null;

            const guestId = userId ? null : (req.guestId || req.session?.guestId);


            if (!userId && !guestId) {
                return sendErrorResponse(res, 'No user or guest session found', 400);
            }

            const cart = await CartService.addToCart(userId, productId, quantity, color, size, guestId);
            sendSuccessResponse(res, { message: 'Item added to cart', cart });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async getCart(req, res) {
        try {
            const userId = req.user?.id || null;
            const guestId = userId ? null : (req.guestId || req.session?.guestId);

            if (!userId && !guestId) {
                return sendSuccessResponse(res, { cart: { items: [], totalAmount: 0 } });
            }

            const cart = await CartService.getCart(userId, guestId);
            sendSuccessResponse(res, { cart });
        } catch (error) {
            console.error('Get cart error:', error);
            sendErrorResponse(res, error.message);
        }
    }

    static async updateItem(req, res) {
        try {
            const { productId, quantity } = req.body;

            const userId = req.user?.id || null;
            const guestId = userId ? null : (req.guestId || req.session?.guestId);

            if (!userId && !guestId) {
                return sendErrorResponse(res, 'No user or guest session found', 400);
            }

            const cart = await CartService.updateItem(userId, productId, quantity, guestId);
            sendSuccessResponse(res, { message: 'Cart item updated', cart });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async removeItem(req, res) {
        try {
            const { productId } = req.body;

            const userId = req.user?.id || null;
            const guestId = userId ? null : (req.guestId || req.session?.guestId);


            if (!userId && !guestId) {
                return sendErrorResponse(res, 'No user or guest session found', 400);
            }

            const cart = await CartService.removeItem(userId, guestId, productId);
            sendSuccessResponse(res, { message: 'Cart item removed', cart });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async clearCart(req, res) {
        try {
            const userId = req.user?.id || null;
            const guestId = userId ? null : (req.guestId || req.session?.guestId);

            if (!userId && !guestId) {
                return sendErrorResponse(res, 'No user or guest session found', 400);
            }

            const cart = await CartService.clearCart(userId, guestId);
            sendSuccessResponse(res, { message: 'Cart cleared', cart });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
}

module.exports = CartController;