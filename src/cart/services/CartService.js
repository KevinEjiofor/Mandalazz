const CartRepository = require('../data/repositories/CartRepository');
const ProductRepository = require('../../product/data/repositories/ProductRepository');
const { calculateTotalAmount } = require('../../utils/cartHelper');

class CartService {
    static async addToCart(userId, productId, quantity, color, size, guestId = null) {
        const { product, variation, sizeDetails } = await this.validateProductAndStock(
            productId,
            color,
            size,
            quantity
        );

        const cart = await this.getOrCreateCart(userId, guestId);
        this.updateCartItems(cart, productId, quantity, color, size);

        cart.totalAmount = await calculateTotalAmount(cart.items);
        await CartRepository.saveCart(cart);

        return cart;
    }

    static async getCart(userId, guestId = null) {
        let cart;

        if (userId) {
            cart = await CartRepository.getCartWithProducts(userId);
        } else if (guestId) {
            cart = await CartRepository.getCartWithProductsByGuestId(guestId);
        }

        return cart || { items: [], totalAmount: 0 };
    }

    static async updateItem(userId, productId, newQuantity, guestId = null) {
        const cart = userId
            ? await CartRepository.findByUser(userId)
            : await CartRepository.findByGuestId(guestId);

        if (!cart) throw new Error('Cart not found');

        const item = cart.items.find((item) => item.product.toString() === productId);
        if (!item) throw new Error('Item not found in cart');

        if (newQuantity <= 0) {
            cart.items = cart.items.filter((item) => item.product.toString() !== productId);
        } else {
            item.quantity = newQuantity;
        }

        cart.totalAmount = await calculateTotalAmount(cart.items);
        await CartRepository.saveCart(cart);
        return cart;
    }

    static async removeItem(userId, guestId, productId) {
        const cart = userId
            ? await CartRepository.findByUser(userId)
            : await CartRepository.findByGuestId(guestId);

        if (!cart) throw new Error('Cart not found');

        cart.items = cart.items.filter((item) => item.product.toString() !== productId);
        cart.totalAmount = await calculateTotalAmount(cart.items);
        await CartRepository.saveCart(cart);
        return cart;
    }

    static async clearCart(userId, guestId = null) {
        const cart = userId
            ? await CartRepository.findByUser(userId)
            : await CartRepository.findByGuestId(guestId);

        if (!cart) throw new Error('Cart not found');

        cart.items = [];
        cart.totalAmount = 0;
        await CartRepository.saveCart(cart);
        return cart;
    }

    static async mergeGuestCartWithUserCart(guestId, userId) {

        try {
            const guestCart = await CartRepository.findByGuestId(guestId);
            if (!guestCart || guestCart.items.length === 0) {
                return;
            }

            let userCart = await CartRepository.findByUser(userId);
            if (!userCart) {
                userCart = await CartRepository.createCart(userId);
            }

            for (const guestItem of guestCart.items) {
                const existingItem = userCart.items.find(
                    (item) =>
                        item.product.toString() === guestItem.product.toString() &&
                        item.color.toLowerCase() === guestItem.color.toLowerCase() &&
                        item.size === guestItem.size
                );

                if (existingItem) {
                  ;
                    existingItem.quantity += guestItem.quantity;
                } else {
                    userCart.items.push({
                        product: guestItem.product,
                        quantity: guestItem.quantity,
                        color: guestItem.color,
                        size: guestItem.size
                    });
                }
            }

            userCart.totalAmount = await calculateTotalAmount(userCart.items);
            await CartRepository.saveCart(userCart);

            await CartRepository.deleteCart(guestCart);

            return userCart;

        } catch (error) {
            throw error;
        }
    }

    static async validateProductAndStock(productId, color, size, quantity) {
        const product = await ProductRepository.findById(productId);
        if (!product) throw new Error('Product not found');

        const variation = product.variations.find(
            (v) => v.color.toLowerCase() === color.toLowerCase()
        );
        if (!variation) {
            throw new Error(`The selected color '${color}' is not available`);
        }

        const sizeDetails = variation.sizes.find(
            (s) => s.size.toLowerCase() === size.toLowerCase()
        );
        if (!sizeDetails) {
            throw new Error(`The selected size '${size}' is not available for color '${color}'`);
        }

        if (sizeDetails.stock < quantity) {
            throw new Error(`Only ${sizeDetails.stock} items are available in ${color} ${size}`);
        }

        return { product, variation, sizeDetails };
    }

    static async getOrCreateCart(userId, guestId) {
        let cart = userId
            ? await CartRepository.findByUser(userId)
            : await CartRepository.findByGuestId(guestId);

        if (!cart) {
            cart = await CartRepository.createCart(userId, guestId);
        }

        return cart;
    }

    static updateCartItems(cart, productId, quantity, color, size) {
        const existingItem = cart.items.find(
            (item) =>
                item.product.toString() === productId &&
                item.color.toLowerCase() === color.toLowerCase() &&
                item.size === size
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({ product: productId, quantity, color, size });
        }
    }
}

module.exports = CartService;