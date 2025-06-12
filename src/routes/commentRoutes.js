const express = require('express');
const router = express.Router();
const commentController = require('../comment/controller/commentController');
const auth = require('../middlewares/authMiddleware');
const isUser = require('../middlewares/isUser');

// Add a comment to a product
router.post('/:id/comment', auth, isUser, commentController.addComment);

// Get all comments for a product
router.get('/:id/comments', commentController.getComments);

// Update a comment - FIXED: consistent parameter naming
router.put('/product/:productId/comment/:commentId', auth, isUser, commentController.updateComment);

// Delete a comment - FIXED: consistent parameter naming
router.delete('/product/:productId/comment/:commentId', auth, isUser, commentController.deleteComment);

// Like / Unlike a comment - FIXED: use commentId consistently
router.post('/comment/:commentId/like', auth, isUser, commentController.likeComment);

// React to a comment with emoji - FIXED: use commentId consistently
router.post('/comment/:commentId/react', auth, isUser, commentController.reactToComment);

// Remove reaction from comment - FIXED: use commentId consistently
router.delete('/comment/:commentId/reaction', auth, isUser, commentController.removeReaction);

module.exports = router;