const Product = require('../../product/data/models/productModel');

class CommentService {
    async addComment(productId, userId, name, commentText) {
        const product = await Product.findById(productId);
        if (!product) throw new Error('Product not found');

        const comment = {
            user: userId,
            name,
            comment: commentText,
        };

        product.comments.push(comment);
        await product.save();
        return comment;
    }

    async deleteComment(productId, commentId, userId, isAdmin) {
        const product = await Product.findById(productId);
        if (!product) throw new Error('Product not found');

        const comment = product.comments.id(commentId);
        if (!comment) throw new Error('Comment not found');

        if (!comment.user.equals(userId) && !isAdmin) {
            throw new Error('Unauthorized to delete this comment');
        }

        comment.remove();
        await product.save();
        return { _id: commentId };
    }

    async getComments(productId) {
        const product = await Product.findById(productId).populate('comments.user', 'firstName email');
        if (!product) throw new Error('Product not found');
        return product.comments;
    }

    async updateComment(productId, commentId, userId, updatedText, isAdmin) {
        const product = await Product.findById(productId);
        if (!product) throw new Error('Product not found');

        const comment = product.comments.id(commentId);
        if (!comment) throw new Error('Comment not found');

        if (!comment.user.equals(userId) && !isAdmin) {
            throw new Error('Unauthorized to update this comment');
        }

        comment.comment = updatedText;
        await product.save();
        return comment;
    }
}

module.exports = new CommentService();
