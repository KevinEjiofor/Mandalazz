const commentService = require('../service/commentService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');

class CommentController {

    async addComment(req, res) {
        try {
            const { commentText } = req.body;

            if (!commentText) {
                return sendErrorResponse(res, 'Comment text is required', 400);
            }

            const comment = await commentService.addComment(
                req.params.id,
                req.user.id,
                commentText
            );

            sendSuccessResponse(res, 'Comment added successfully', comment);
        } catch (error) {
            console.error('Error adding comment:', error);
            sendErrorResponse(res, error.message, 400);
        }
    }

    async deleteComment(req, res) {
        try {
            const { productId, commentId } = req.params;
            const user = req.user;

            if (!productId || !commentId) {
                return sendErrorResponse(res, 'Product ID or Comment ID is missing', 400);
            }

            const result = await commentService.deleteComment(
                // productId,
                // commentId,

                user.role === 'admin'
            );

            sendSuccessResponse(res, 'Comment deleted successfully', result);
        } catch (error) {
            console.error('Error deleting comment:', error);
            sendErrorResponse(res, error.message, 500);
        }
    }

    async getComments(req, res) {
        try {
            const { id: productId } = req.params;

            if (!productId) {
                return sendErrorResponse(res, 'Product ID is required', 400);
            }

            const comments = await commentService.getComments(productId);
            sendSuccessResponse(res, 'Comments fetched successfully', comments);
        } catch (error) {
            console.error('Error fetching comments:', error);
            sendErrorResponse(res, error.message, 500);
        }
    }

    async updateComment(req, res) {
        try {
            const { productId, commentId } = req.params;
            const { comment } = req.body;
            const user = req.user;

            if (!comment || !productId || !commentId) {
                return sendErrorResponse(res, 'Comment, Product ID, or Comment ID is missing', 400);
            }

            const updated = await commentService.updateComment(
                productId,
                commentId,
                user.id,
                comment,
                user.role === 'admin'
            );

            sendSuccessResponse(res, 'Comment updated successfully', updated);
        } catch (error) {
            console.error('Error updating comment:', error);
            sendErrorResponse(res, error.message, 500);
        }
    }

    async likeComment(req, res) {
        try {
            const { commentId } = req.params;
            const userId = req.user.id;

            const result = await commentService.toggleLike(commentId, userId);
            sendSuccessResponse(res, 'Comment liked/unliked successfully', result);
        } catch (error) {
            console.error('Error liking comment:', error);
            sendErrorResponse(res, error.message, 500);
        }
    }

    async reactToComment(req, res) {
        try {
            const { commentId } = req.params;
            const { emoji } = req.body;
            const userId = req.user.id;

            if (!emoji) {
                return sendErrorResponse(res, 'Emoji is required', 400);
            }

            const result = await commentService.reactWithEmoji(commentId, userId, emoji);
            sendSuccessResponse(res, 'Reaction added successfully', result);
        } catch (error) {
            console.error('Error reacting to comment:', error);
            sendErrorResponse(res, error.message, 500);
        }
    }

    async removeReaction(req, res) {
        try {
            const { commentId } = req.params;
            const userId = req.user.id;

            const result = await commentService.removeReaction(commentId, userId);

            sendSuccessResponse(res, 'Reaction removed successfully', result);
        } catch (error) {
            console.error('Error removing reaction:', error);
            sendErrorResponse(res, error.message, 500);
        }
    }


}

module.exports = new CommentController;
