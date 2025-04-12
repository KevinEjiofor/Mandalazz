const express = require('express');
const router = express.Router();
const commentController = require('../comment/controller/commentController');
const auth = require('../middlewares/authMiddleware');

// Add a comment
router.post('/:id/comment', auth, commentController.addComment);

// Delete a comment (user or admin)
router.delete('/:productId/comment/:commentId', auth, commentController.deleteComment);

// Get all comments for a product
router.get('/:id/comments', commentController.getComments);

// Update a comment
router.put('/:productId/comment/:commentId', auth, commentController.updateComment);

module.exports = router;
