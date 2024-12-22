const Cart = require('../data/models/cartModel');
const Product = require('../../product/data/models/productModel');

class CartService {
    static async addToCart(userId, guestId, productId, quantity, size) {
        const product = await Product.findById(productId);
        if (!product) throw new Error('Product not found');

        const cartQuery = userId ? { user: userId } : { guestId };
        const expirationPeriod = userId ? 10 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 10 days or 24 hours
        const expiresAt = new Date(Date.now() + expirationPeriod);

        let cart = await Cart.findOne(cartQuery);

        if (!cart) {
            cart = await Cart.create({
                user: userId || null,
                guestId: guestId || null,
                products: [{ product: productId, quantity, size }],
                expiresAt,
            });
        } else {
            const productIndex = cart.products.findIndex(
                (item) => item.product.toString() === productId && item.size === size
            );
            if (productIndex >= 0) {
                cart.products[productIndex].quantity += quantity;
            } else {
                cart.products.push({ product: productId, quantity, size });
            }
            cart.expiresAt = expiresAt; // Update expiration
            await cart.save();
        }

        return cart;
    }

    static async getCart(userId, guestId) {
        const cartQuery = userId ? { user: userId } : { guestId };
        const cart = await Cart.findOne(cartQuery).populate('products.product');
        if (!cart) throw new Error('Cart not found');
        return cart;
    }

    static async removeFromCart(userId, guestId, productId, size) {
        const cartQuery = userId ? { user: userId } : { guestId };
        const cart = await Cart.findOne(cartQuery);
        if (!cart) throw new Error('Cart not found');

        cart.products = cart.products.filter(
            (item) => item.product.toString() !== productId || item.size !== size
        );

        await cart.save();
        return cart;
    }

    static async clearExpiredCarts() {
        await Cart.deleteMany({ expiresAt: { $lte: new Date() } });
    }
}

module.exports = CartService;
