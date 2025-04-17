const express = require('express');
const router = express.Router();
const commentController = require('../comment/controller/commentController');
const auth = require('../middlewares/authMiddleware');
const isUser = require('../middlewares/isUser');

// Add a comment
router.post('/:id/comment', auth, isUser, commentController.addComment);

// Delete a comment (user or admin)
router.delete('/:productId/comment/:commentId', auth, isUser,commentController.deleteComment);

// Get all comments for a product
router.get('/:id/comments', commentController.getComments);

// Update a comment
router.put('/:productId/comment/:commentId', auth, isUser,commentController.updateComment);

// Like / Unlike a comment
router.post('/:commentId/like', auth, isUser, commentController.likeComment);

// React to a comment with emoji
router.post('/:commentId/react', auth, isUser, commentController.reactToComment);

// Remove reaction from comment
router.delete('/:commentId/reaction', auth, isUser, commentController.removeReaction);



module.exports = router;
