const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');
const CartService = require('../services/CartService');

class CartController {
    static async addToCart(req, res) {
        try {
            const { productId, quantity, color, size } = req.body;
            const userId = req.user?.id || null;
            const guestId = req.guestId || null;

            const cart = await CartService.addToCart(userId, productId, quantity, color, size, guestId);
            sendSuccessResponse(res, { message: 'Item added to cart' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async getCart(req, res) {
        try {
            const userId = req.user?.id;
            const cart = await CartService.getCart(userId);
            sendSuccessResponse(res, { cart });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    static async updateItem(req, res) {
        try {
            const { productId, quantity } = req.body;
            const userId = req.user?.id;
            const cart = await CartService.updateItem(userId, productId, quantity);
            sendSuccessResponse(res, { message: 'Cart item updated'});
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
    static async removeItem(req, res) {
        try {
            const { productId } = req.body;
            const userId = req.user?.id;
            const guestId = req.guestId;

            if (!userId && !guestId) {
                return sendErrorResponse(res, 'User or guest ID is required', 400);
            }

            const cart = await CartService.removeItem(userId, guestId, productId);
            sendSuccessResponse(res, { message: 'Cart item removed', cart });
        } catch (error) {
            console.error(error);
            sendErrorResponse(res, error.message);
        }
    }


    //
    // static async removeItem(req, res) {
    //     try {
    //         const { productId } = req.body;
    //
    //         // Extract userId (if logged in) or guestId (if guest) from the request
    //         const userId = req.user?.id;
    //         const guestId = req.cookies?.guestId; // Assuming guestId is stored in cookies
    //
    //         if (!userId && !guestId) {
    //             return sendErrorResponse(res, 'User or guest ID is required', 400);
    //         }
    //
    //         // Remove the item from the appropriate cart
    //         const cart = await CartService.removeItem(userId, productId, guestId);
    //         sendSuccessResponse(res, { message: 'Cart item removed', cart });
    //     } catch (error) {
    //         sendErrorResponse(res, error.message);
    //     }
    // }


    static async clearCart(req, res) {
        try {
            const userId = req.user?.id;
            const cart = await CartService.clearCart(userId);
            sendSuccessResponse(res, { message: 'Cart cleared' });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
}

module.exports = CartController;
