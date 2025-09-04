const express = require('express');
const router = express.Router();
const commentController = require('../comment/controller/commentController');
const auth = require('../middlewares/authMiddleware');
const isUser = require('../middlewares/isUser');

router.post('/:id/comment', auth, isUser, commentController.addComment);
router.get('/:id/comments', commentController.getComments);
router.put('/product/:productId/comment/:commentId', auth, isUser, commentController.updateComment);
router.delete('/product/:productId/comment/:commentId', auth, isUser, commentController.deleteComment);
router.post('/comment/:commentId/like', auth, isUser, commentController.likeComment);
router.post('/comment/:commentId/react', auth, isUser, commentController.reactToComment);
router.delete('/comment/:commentId/reaction', auth, isUser, commentController.removeReaction);

module.exports = router;
