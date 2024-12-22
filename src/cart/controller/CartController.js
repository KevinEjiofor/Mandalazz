const CartService = require('../services/CartService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/responseHandler');

class CartController {
    static async addToCart(req, res) {
        try {
            const userId = req.user?.id;
            const guestId = req.sessionID; // Use session ID for guests
            const { productId, quantity, size } = req.body;

            const cart = await CartService.addToCart(userId, guestId, productId, quantity, size);
            sendSuccessResponse(res, cart);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async getCart(req, res) {
        try {
            const userId = req.user?.id;
            const guestId = req.sessionID;

            const cart = await CartService.getCart(userId, guestId);
            sendSuccessResponse(res, cart);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async removeFromCart(req, res) {
        try {
            const userId = req.user?.id;
            const guestId = req.sessionID;
            const { productId, size } = req.body;

            const cart = await CartService.removeFromCart(userId, guestId, productId, size);
            sendSuccessResponse(res, cart);
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
}

module.exports = CartController;
