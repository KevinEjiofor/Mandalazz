const commentService = require('../service/commentService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');

class CommentController {

    async addComment(req, res) {
        try {
            const { commentText } = req.body;
            const productId = req.params.id; // This matches the route /:id/comment

            if (!commentText) {
                return sendErrorResponse(res, 'Comment text is required', 400);
            }

            console.log(`Adding comment to product ${productId} by user ${req.user.id}`);

            const comment = await commentService.addComment(
                productId,
                req.user.id,
                commentText
            );

            sendSuccessResponse(res, 'Comment added successfully', comment);
        } catch (error) {
            console.error('Add comment error:', error);
            sendErrorResponse(res, error.message, 400);
        }
    }

    async deleteComment(req, res) {
        try {
            const { productId, commentId } = req.params;
            const user = req.user;

            console.log(`Delete request - ProductId: ${productId}, CommentId: ${commentId}, UserId: ${user.id}`);

            if (!productId || !commentId) {
                return sendErrorResponse(res, 'Product ID or Comment ID is missing', 400);
            }

            const result = await commentService.deleteComment(
                productId,
                commentId,
                user.id,
                user.role === 'admin'
            );

            sendSuccessResponse(res, 'Comment deleted successfully', result);
        } catch (error) {
            console.error('Delete comment error:', error);
            sendErrorResponse(res, error.message, 500);
        }
    }

    async getComments(req, res) {
        try {
            const { id: productId } = req.params; // This matches the route /:id/comments

            if (!productId) {
                return sendErrorResponse(res, 'Product ID is required', 400);
            }

            console.log(`Fetching comments for product ${productId}`);

            const comments = await commentService.getComments(productId);
            sendSuccessResponse(res, 'Comments fetched successfully', comments);
        } catch (error) {
            console.error('Get comments error:', error);
            sendErrorResponse(res, error.message, 500);
        }
    }

    async updateComment(req, res) {
        try {
            const { productId, commentId } = req.params;
            const { comment } = req.body;
            const user = req.user;

            console.log(`Update request - ProductId: ${productId}, CommentId: ${commentId}, UserId: ${user.id}`);

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
            console.error('Update comment error:', error);
            sendErrorResponse(res, error.message, 500);
        }
    }

    async likeComment(req, res) {
        try {
            const { commentId } = req.params; // Now matches /comment/:commentId/like
            const userId = req.user.id;

            console.log(`Toggle like for comment ${commentId} by user ${userId}`);

            const result = await commentService.toggleLike(commentId, userId);
            sendSuccessResponse(res, 'Comment liked/unliked successfully', result);
        } catch (error) {
            console.error('Like comment error:', error);
            sendErrorResponse(res, error.message, 500);
        }
    }

    async reactToComment(req, res) {
        try {
            const { commentId } = req.params; // Now matches /comment/:commentId/react
            const { emoji } = req.body;
            const userId = req.user.id;

            if (!emoji) {
                return sendErrorResponse(res, 'Emoji is required', 400);
            }

            console.log(`React to comment ${commentId} with ${emoji} by user ${userId}`);

            const result = await commentService.reactWithEmoji(commentId, userId, emoji);
            sendSuccessResponse(res, 'Reaction added successfully', result);
        } catch (error) {
            console.error('React to comment error:', error);
            sendErrorResponse(res, error.message, 500);
        }
    }

    async removeReaction(req, res) {
        try {
            const { commentId } = req.params; // Now matches /comment/:commentId/reaction
            const userId = req.user.id;

            console.log(`Remove reaction from comment ${commentId} by user ${userId}`);

            const result = await commentService.removeReaction(commentId, userId);

            sendSuccessResponse(res, 'Reaction removed successfully', result);
        } catch (error) {
            console.error('Remove reaction error:', error);
            sendErrorResponse(res, error.message, 500);
        }
    }
}

module.exports = new CommentController;