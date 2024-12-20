const Product = require('../../product/data/models/productModel');
const Order = require('../data/models/orderModel');


class OrderService {
    static async createOrder(userId, orderDetails) {
        const { products, userDetails } = orderDetails;

        if (!userDetails || !userDetails.address || !userDetails.phoneNumber) {
            throw new Error('User details including address and phone number are required');
        }

        let totalAmount = 0;

        const productDetails = await Promise.all(
            products.map(async (item) => {
                const product = await Product.findById(item.product);
                if (!product) throw new Error(`Product with ID ${item.product} not found`);


                totalAmount += product.price * item.quantity;
                return { product: item.product, quantity: item.quantity, size: item.size };
            })
        );

        const newOrder = new Order({
            user: userId || null,
            products: productDetails,
            totalAmount,
            userDetails,
        });

        await newOrder.save();
        return newOrder;
    }

    static async getOrdersByUser(userId) {
        return Order.find({user: userId}).populate('products.product');
    }
    static async getAllOrders() {
        return Order.find({}).populate('products.product');
    }

    static async updateOrderStatus(orderId, status) {
        const order = await Order.findById(orderId);
        if (!order) throw new Error('Order not found');
        order.status = status;
        await order.save();
        return order;
    }

    static async deleteOrder(orderId, userId) {
        const order = await Order.findOne({ _id: orderId, user: userId });
        if (!order) {
            throw new Error('Order not found or you are not authorized to delete this order');
        }
        await order.deleteOne();
        return { message: 'Order deleted successfully' };
    }
}

module.exports = OrderService;
