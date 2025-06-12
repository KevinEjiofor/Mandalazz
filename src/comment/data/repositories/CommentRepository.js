const Comment = require('../model/commentModel');
const Product = require('../../../product/data/models/productModel');
const User = require('../../../user/data/models/userModel');

class CommentRepository {

    async getProductById(productId) {
        return Product.findById(productId);
    }

    async getUserById(userId) {
        return User.findById(userId);
    }

    async getCommentById(commentId) {
        return Comment.findById(commentId).populate('user', 'firstName lastName');
    }

    async createComment({ productId, userId, firstName, lastName, comment }) {
        const newComment = new Comment({
            product: productId,
            user: userId,
            firstName,
            lastName,
            comment
        });
        return await newComment.save();
    }

    async deleteComment(commentId) {
        return Comment.findByIdAndDelete(commentId);
    }

    async updateComment(commentId, content) {
        return Comment.findByIdAndUpdate(
            commentId,
            { comment: content },
            { new: true }
        ).populate('user', 'firstName lastName');
    }

    async likeComment(commentId, userId) {
        return Comment.findByIdAndUpdate(
            commentId,
            { $addToSet: { likes: userId } },
            { new: true }
        ).populate('user', 'firstName lastName');
    }

    async unlikeComment(commentId, userId) {
        return Comment.findByIdAndUpdate(
            commentId,
            { $pull: { likes: userId } },
            { new: true }
        ).populate('user', 'firstName lastName');
    }

    async updateReactions(commentId, reactions) {
        return Comment.findByIdAndUpdate(
            commentId,
            { reactions },
            { new: true }
        ).populate('user', 'firstName lastName');
    }

    async getCommentWithReactions(commentId) {
        return Comment.findById(commentId).select('reactions');
    }

    async getCommentsByProductId(productId) {
        const product = await Product.findById(productId).populate({
            path: 'comments',
            populate: {
                path: 'user',
                select: 'firstName lastName'
            }
        });

        if (!product) throw new Error('Product not found');
        return product.comments;
    }

    // ADDED: Additional helper methods
    async getCommentsByUserId(userId) {
        return Comment.find({ user: userId })
            .populate('user', 'firstName lastName')
            .populate('product', 'name')
            .sort({ createdAt: -1 });
    }

    async getCommentCount(productId) {
        const product = await Product.findById(productId);
        if (!product) return 0;
        return product.comments.length;
    }

    async getRecentComments(limit = 10) {
        return Comment.find()
            .populate('user', 'firstName lastName')
            .populate('product', 'name')
            .sort({ createdAt: -1 })
            .limit(limit);
    }
}

module.exports = new CommentRepository();