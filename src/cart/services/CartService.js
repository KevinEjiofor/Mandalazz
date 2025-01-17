const Cart = require('../data/models/cartModel');
const Product = require('../../product/data/models/productModel');
const { calculateTotalAmount } = require('../../utils/cartHelper');

class CartService {
    static async addToCart(userId, productId, quantity, color, size, guestId = null) {

        const { product, variation, sizeDetails } = await CartService.validateProductAndStock(
            productId,
            color,
            size,
            quantity
        );

        const cart = await CartService.getOrCreateCart(userId, guestId);

        CartService.updateCartItems(cart, productId, quantity, color, size);

        cart.totalAmount = await calculateTotalAmount(cart.items);
        await cart.save();

        return cart;
    }

    static async getCart(userId) {
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        return cart || { items: [], totalAmount: 0 };
    }

    static async updateItem(userId, productId, newQuantity) {
        const cart = await Cart.findOne({ user: userId });
        if (!cart) throw new Error('Cart not found');

        const item = cart.items.find((item) => item.product.toString() === productId);
        if (!item) throw new Error('Item not found in cart');

        if (newQuantity <= 0) {
            cart.items = cart.items.filter((item) => item.product.toString() !== productId);
        } else {
            item.quantity = newQuantity;
        }

        cart.totalAmount = await calculateTotalAmount(cart.items);
        await cart.save();

        return cart;
    }
    static async removeItem(userId, guestId, productId) {
        let cart;

        if (userId) {
            cart = await Cart.findOne({ user: userId });
        } else if (guestId) {
            cart = await Cart.findOne({ guestId });
        }

        if (!cart) throw new Error('Cart not found');

        cart.items = cart.items.filter((item) => item.product.toString() !== productId);

        cart.totalAmount = await calculateTotalAmount(cart.items);
        await cart.save();

        return cart;
    }

    static async clearCart(userId) {
        const cart = await Cart.findOne({ user: userId });
        if (!cart) throw new Error('Cart not found');

        cart.items = [];
        cart.totalAmount = 0;
        await cart.save();

        return cart;
    }

    static async mergeGuestCartWithUserCart(guestId, userId) {
        const guestCart = await Cart.findOne({ guestId });
        if (!guestCart) return;

        let userCart = await Cart.findOne({ user: userId });
        if (!userCart) {
            userCart = new Cart({ user: userId, items: [] });
        }

        guestCart.items.forEach((guestItem) => {
            const userItem = userCart.items.find(
                (item) =>
                    item.product.toString() === guestItem.product.toString() &&
                    item.color.toLowerCase() === guestItem.color.toLowerCase() &&
                    item.size === guestItem.size
            );
            if (userItem) {
                userItem.quantity += guestItem.quantity;
            } else {
                userCart.items.push(guestItem);
            }
        });

        userCart.totalAmount = await calculateTotalAmount(userCart.items);
        await userCart.save();
        await guestCart.deleteOne();
    }
    static async validateProductAndStock(productId, color, size, quantity) {
        const product = await Product.findById(productId);
        if (!product) throw new Error('Product not found');


        const variation = product.variations.find(
            (v) => v.color.toLowerCase() === color.toLowerCase()
        );
        if (!variation) {
            throw new Error(`The selected color '${color}' is not available`);
        }

        const sizeDetails = variation.sizes.find((s) => s.size.toLowerCase() === size.toLowerCase());
        if (!sizeDetails) {
            throw new Error(`The selected size '${size}' is not available for color '${color}'`);
        }

        if (sizeDetails.stock < quantity) {
            throw new Error(`Only ${sizeDetails.stock} items are available in ${color} ${size}`);
        }

        return { product, variation, sizeDetails };
    }

    static async getOrCreateCart(userId, guestId) {
        let cart;

        if (userId) {
            cart = await Cart.findOne({ user: userId });
        } else if (guestId) {
            cart = await Cart.findOne({ guestId });
        }

        if (!cart) {
            cart = new Cart({ user: userId, guestId, items: [] });
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
