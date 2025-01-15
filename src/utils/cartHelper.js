// utils/cartHelper.js
const Product = require('../product/data/models/productModel');

module.exports.validateProduct = async (productId) => {
    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');
    return product;
};

module.exports.calculateTotalAmount = async (items) => {
    let total = 0;
    for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) throw new Error(`Product not found for ID: ${item.product}`);
        total += product.price * item.quantity;
    }
    return total;
};
