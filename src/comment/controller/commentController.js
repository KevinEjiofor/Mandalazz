const commentService = require('../service/commentService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');

exports.addComment = async (req, res) => {
    try {
        const { comment } = req.body;
        const { id: productId } = req.params;
        const user = req.user;

        if (!comment || !productId) {
            return sendErrorResponse(res, 'Comment or Product ID is missing', 400);
        }

        const result = await commentService.addComment(productId, user.id, user.firstName, comment);
        sendSuccessResponse(res, 'Comment added successfully', result);
    } catch (error) {
        console.error('Error adding comment:', error); // Optional: log error for debugging
        sendErrorResponse(res, error.message, 500);
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const { productId, commentId } = req.params;
        const user = req.user;

        if (!productId || !commentId) {
            return sendErrorResponse(res, 'Product ID or Comment ID is missing', 400);
        }

        const result = await commentService.deleteComment(productId, commentId, user.id, user.role === 'admin');
        sendSuccessResponse(res, 'Comment deleted successfully', result);
    } catch (error) {
        console.error('Error deleting comment:', error); // Optional: log error for debugging
        sendErrorResponse(res, error.message, 500);
    }
};

exports.getComments = async (req, res) => {
    try {
        const { id: productId } = req.params;

        if (!productId) {
            return sendErrorResponse(res, 'Product ID is required', 400);
        }

        const comments = await commentService.getComments(productId);
        sendSuccessResponse(res, 'Comments fetched successfully', comments);
    } catch (error) {
        console.error('Error fetching comments:', error); // Optional: log error for debugging
        sendErrorResponse(res, error.message, 500);
    }
};

exports.updateComment = async (req, res) => {
    try {
        const { productId, commentId } = req.params;
        const { comment } = req.body;
        const user = req.user;

        if (!comment || !productId || !commentId) {
            return sendErrorResponse(res, 'Comment, Product ID, or Comment ID is missing', 400);
        }

        const updated = await commentService.updateComment(productId, commentId, user.id, comment, user.role === 'admin');
        sendSuccessResponse(res, 'Comment updated successfully', updated);
    } catch (error) {
        console.error('Error updating comment:', error); // Optional: log error for debugging
        sendErrorResponse(res, error.message, 500);
    }
};
