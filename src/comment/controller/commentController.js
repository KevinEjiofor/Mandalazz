const commentService = require('../service/commentService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');

exports.addComment = async (req, res) => {
    try {
        const { comment } = req.body;
        const { id: productId } = req.params;
        const user = req.user;

        const result = await commentService.addComment(productId, user.id, user.firstName, comment);
        sendSuccessResponse(res, 'Comment added successfully', result);
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const { productId, commentId } = req.params;
        const user = req.user;

        const result = await commentService.deleteComment(productId, commentId, user.id, user.role === 'admin');
        sendSuccessResponse(res, 'Comment deleted successfully', result);
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

exports.getComments = async (req, res) => {
    try {
        const { id: productId } = req.params;
        const comments = await commentService.getComments(productId);
        sendSuccessResponse(res, 'Comments fetched successfully', comments);
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

exports.updateComment = async (req, res) => {
    try {
        const { productId, commentId } = req.params;
        const { comment } = req.body;
        const user = req.user;

        const updated = await commentService.updateComment(productId, commentId, user.id, comment, user.role === 'admin');
        sendSuccessResponse(res, 'Comment updated successfully', updated);
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};
