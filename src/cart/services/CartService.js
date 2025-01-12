const Cart = require('../data/models/cartModel');
const Product = require('../../product/data/models/productModel');

class CartService {
    static async addToCart(userId, productId, quantity, color, size, guestId = null) {
        let cart;

        await this.validateProduct(productId);

        if (userId) {
            cart = await Cart.findOne({ user: userId });
        } else if (guestId) {
            cart = await Cart.findOne({ guestId });
        }

        if (!cart) {
            cart = new Cart({ user: userId, guestId, items: [] });
        }

        const existingItem = cart.items.find(
            (item) =>
                item.product.toString() === productId &&
                item.color === color &&
                item.size === size
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({ product: productId, quantity, color, size });
        }

        cart.totalAmount = await this.calculateTotalAmount(cart.items);
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

        cart.totalAmount = await this.calculateTotalAmount(cart.items);
        await cart.save();

        return cart;
    }

    static async removeItem(userId, productId) {
        const cart = await Cart.findOne({ user: userId });
        if (!cart) throw new Error('Cart not found');

        cart.items = cart.items.filter((item) => item.product.toString() !== productId);

        cart.totalAmount = await this.calculateTotalAmount(cart.items);
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
                    item.color === guestItem.color &&
                    item.size === guestItem.size
            );
            if (userItem) {
                userItem.quantity += guestItem.quantity;
            } else {
                userCart.items.push(guestItem);
            }
        });

        userCart.totalAmount = await this.calculateTotalAmount(userCart.items);
        await userCart.save();
        await guestCart.deleteOne();
    }

    static async calculateTotalAmount(items) {
        let total = 0;
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                throw new Error(`Product not found for ID: ${item.product}`);
            }
            total += product.price * item.quantity;
        }
        return total;
    }

    static async validateProduct(productId) {
        const product = await Product.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }
    }
}

module.exports = CartService;
