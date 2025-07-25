const commentRepository = require('../data/repositories/CommentRepository');
const { getIO } = require('../../utils/socketHandler');
const NotificationService = require('../../notification/service/NotificationService');

class CommentService {

    static async addComment(productId, userId, commentText) {
        const product = await commentRepository.getProductById(productId);
        if (!product) throw new Error('Product not found');

        const user = await commentRepository.getUserById(userId);
        if (!user) throw new Error('User not found');

        const comment = await commentRepository.createComment({
            productId,
            userId,
            firstName: user.firstName,
            lastName: user.lastName,
            comment: commentText,
        });

        product.comments.push(comment._id);
        await product.save();

        const socket = getIO();
        if (socket) {
            socket.emit('commentAdded', {
                productId,
                comment: {
                    firstName: comment.firstName,
                    lastName: comment.lastName,
                    comment: comment.comment,
                    createdAt: comment.createdAt,
                },
            });

            socket.to('adminRoom').emit('adminNotification', {
                type: 'comment_added',
                message: `${user.firstName} ${user.lastName} commented on product ${product.name}`,
                data: {
                    productId,
                    commentId: comment._id,
                    userId,
                    productName: product.name,
                    comment: commentText,
                },
                action: {
                    type: 'navigate',
                    url: `/products/${productId}`,
                    params: {
                        commentId: comment._id,
                        scrollTo: 'comments'
                    },
                    label: 'View Comment'
                }
            });
        }

        // Create notification with clickable action
        await NotificationService.createNotificationWithAction(
            'comment_added',
            `${user.firstName} ${user.lastName} commented on "${product.name}"`,
            {
                productId,
                commentId: comment._id,
                userId,
                productName: product.name,
                comment: commentText,
            },
            {
                type: 'navigate',
                url: `/products/${productId}`,
                params: {
                    commentId: comment._id,
                    scrollTo: 'comments'
                },
                label: 'View Comment'
            }
        );

        return {
            comment_id: comment._id,
            firstName: user.firstName,
            lastName: user.lastName,
            comment: comment.comment,
            createdAt: comment.createdAt,
        };
    }

    static async updateComment(productId, commentId, userId, newCommentText, isAdmin) {
        console.log(`Attempting to update comment: ${commentId}`);

        const comment = await commentRepository.getCommentById(commentId);
        if (!comment) {
            console.error(`Comment not found for ID: ${commentId}`);
            throw new Error('Comment not found');
        }


        const commentUserId = comment.user._id ? comment.user._id.toString() : comment.user.toString();
        const requestUserId = userId.toString();




        if (!isAdmin && commentUserId !== requestUserId) {
            throw new Error('Unauthorized to update this comment');
        }

        const updatedComment = await commentRepository.updateComment(commentId, newCommentText);
        if (!updatedComment) {
            throw new Error('Comment not found or update failed');
        }

        const socket = getIO();
        if (socket) {
            socket.emit('commentUpdated', {
                commentId,
                comment: updatedComment.comment,
            });


            const product = await commentRepository.getProductById(productId);
            socket.to('adminRoom').emit('adminNotification', {
                type: 'comment_updated',
                message: `Comment updated on product ${product?.name || 'Unknown'}`,
                data: {
                    productId,
                    commentId,
                    userId,
                    productName: product?.name,
                    newComment: newCommentText,
                },
                action: {
                    type: 'navigate',
                    url: `/products/${productId}`,
                    params: {
                        commentId: commentId,
                        scrollTo: 'comments'
                    },
                    label: 'View Updated Comment'
                }
            });
        }

        return updatedComment;
    }

    // FIXED: Updated deleteComment method with proper authorization
    static async deleteComment(productId, commentId, userId, isAdmin) {
        const mongoose = require('mongoose');

        console.log(`Delete attempt - ProductId: ${productId}, CommentId: ${commentId}, UserId: ${userId}, IsAdmin: ${isAdmin}`);

        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            console.error(`Invalid comment ID: ${commentId}`);
            throw new Error('Invalid comment ID');
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            console.error(`Invalid product ID: ${productId}`);
            throw new Error('Invalid product ID');
        }

        console.log(`Deleting comment ${commentId} from product ${productId}`);

        const comment = await commentRepository.getCommentById(commentId);
        if (!comment) {
            console.error(`Comment not found for ID: ${commentId}`);
            throw new Error('Comment not found');
        }

        const commentUserId = comment.user._id ? comment.user._id.toString() : comment.user.toString();
        const requestUserId = userId.toString();

        if (!isAdmin && commentUserId !== requestUserId) {
            console.error(`User ${userId} not authorized to delete comment ${commentId}`);
            throw new Error('Unauthorized to delete this comment');
        }

        await commentRepository.deleteComment(commentId);

        const product = await commentRepository.getProductById(productId);
        if (product) {
            product.comments.pull(commentId);
            await product.save();
        }

        const socket = getIO();
        if (socket) {
            socket.emit('commentDeleted', { commentId });

            socket.to('adminRoom').emit('adminNotification', {
                type: 'comment_deleted',
                message: `Comment deleted from product ${product?.name || 'Unknown'}`,
                data: {
                    productId,
                    commentId,
                    userId,
                    productName: product?.name,
                },
                action: {
                    type: 'navigate',
                    url: `/products/${productId}`,
                    params: {
                        scrollTo: 'comments'
                    },
                    label: 'View Product'
                }
            });
        }

        await NotificationService.createNotificationWithAction(
            'comment_deleted',
            `Comment deleted from "${product?.name || 'Unknown'}"`,
            {
                productId,
                commentId,
                userId,
                productName: product?.name,
            },
            {
                type: 'navigate',
                url: `/products/${productId}`,
                params: {
                    scrollTo: 'comments'
                },
                label: 'View Product'
            }
        );

        return { message: 'Comment deleted successfully' };
    }

    static async likeComment(commentId, userId) {
        const updatedComment = await commentRepository.likeComment(commentId, userId);
        if (!updatedComment) throw new Error('Comment not found');

        const user = await commentRepository.getUserById(userId);
        const product = await commentRepository.getProductById(updatedComment.productId);

        const socket = getIO();
        if (socket) {
            socket.emit('commentLiked', {
                commentId,
                likes: updatedComment.likes,
            });

            if (user && product) {
                socket.to('adminRoom').emit('adminNotification', {
                    type: 'comment_liked',
                    message: `${user.firstName} ${user.lastName} liked a comment on "${product.name}"`,
                    data: {
                        productId: updatedComment.productId,
                        commentId,
                        userId,
                        productName: product.name,
                        likesCount: updatedComment.likes.length,
                    },
                    action: {
                        type: 'navigate',
                        url: `/products/${updatedComment.productId}`,
                        params: {
                            commentId: commentId,
                            scrollTo: 'comments'
                        },
                        label: 'View Comment'
                    }
                });
            }
        }

        return updatedComment;
    }

    static async unlikeComment(commentId, userId) {
        const updatedComment = await commentRepository.unlikeComment(commentId, userId);
        if (!updatedComment) throw new Error('Comment not found');

        const user = await commentRepository.getUserById(userId);
        const product = await commentRepository.getProductById(updatedComment.productId);

        const socket = getIO();
        if (socket) {
            socket.emit('commentUnliked', {
                commentId,
                likes: updatedComment.likes,
            });

            if (user && product) {
                socket.to('adminRoom').emit('adminNotification', {
                    type: 'comment_unliked',
                    message: `${user.firstName} ${user.lastName} unliked a comment on "${product.name}"`,
                    data: {
                        productId: updatedComment.productId,
                        commentId,
                        userId,
                        productName: product.name,
                        likesCount: updatedComment.likes.length,
                    },
                    action: {
                        type: 'navigate',
                        url: `/products/${updatedComment.productId}`,
                        params: {
                            commentId: commentId,
                            scrollTo: 'comments'
                        },
                        label: 'View Comment'
                    }
                });
            }
        }

        return updatedComment;
    }

    static async reactToComment(commentId, emoji) {
        const comment = await commentRepository.getCommentWithReactions(commentId);
        if (!comment) throw new Error('Comment not found');

        const reactions = comment.reactions || {};
        reactions[emoji] = (reactions[emoji] || 0) + 1;

        const updatedComment = await commentRepository.updateReactions(commentId, reactions);

        const product = await commentRepository.getProductById(updatedComment.productId);

        const socket = getIO();
        if (socket) {
            socket.emit('commentReacted', {
                commentId,
                reactions: updatedComment.reactions,
            });

            if (product) {
                socket.to('adminRoom').emit('adminNotification', {
                    type: 'comment_reacted',
                    message: `Someone reacted ${emoji} to a comment on "${product.name}"`,
                    data: {
                        productId: updatedComment.productId,
                        commentId,
                        productName: product.name,
                        emoji: emoji,
                        reactions: updatedComment.reactions,
                    },
                    action: {
                        type: 'navigate',
                        url: `/products/${updatedComment.productId}`,
                        params: {
                            commentId: commentId,
                            scrollTo: 'comments'
                        },
                        label: 'View Comment'
                    }
                });
            }
        }

        return updatedComment;
    }

    static async getCommentsByProduct(productId) {
        return await commentRepository.getCommentsByProductId(productId);
    }

    static async getComments(productId) {
        return await this.getCommentsByProduct(productId);
    }

    static async toggleLike(commentId, userId) {
        const comment = await commentRepository.getCommentById(commentId);
        if (!comment) throw new Error('Comment not found');

        const isLiked = comment.likes.includes(userId);

        if (isLiked) {
            return await this.unlikeComment(commentId, userId);
        } else {
            return await this.likeComment(commentId, userId);
        }
    }

    static async reactWithEmoji(commentId, userId, emoji) {
        const comment = await commentRepository.getCommentById(commentId);
        if (!comment) throw new Error('Comment not found');

        let reactionIndex = comment.reactions.findIndex(r => r.emoji === emoji);
        let actionType = 'added';

        if (reactionIndex === -1) {

            comment.reactions.push({ emoji, users: [userId] });
        } else {

            const userIndex = comment.reactions[reactionIndex].users.indexOf(userId);
            if (userIndex === -1) {
                comment.reactions[reactionIndex].users.push(userId);
            } else {
               n
                comment.reactions[reactionIndex].users.splice(userIndex, 1);
                actionType = 'removed';

                if (comment.reactions[reactionIndex].users.length === 0) {
                    comment.reactions.splice(reactionIndex, 1);
                }
            }
        }

        const updatedComment = await commentRepository.updateReactions(commentId, comment.reactions);

        const user = await commentRepository.getUserById(userId);
        const product = await commentRepository.getProductById(comment.productId);

        const socket = getIO();
        if (socket) {
            socket.emit('commentReacted', {
                commentId,
                reactions: updatedComment.reactions,
            });

            if (user && product) {
                socket.to('adminRoom').emit('adminNotification', {
                    type: 'comment_emoji_reaction',
                    message: `${user.firstName} ${user.lastName} ${actionType} ${emoji} reaction to a comment on "${product.name}"`,
                    data: {
                        productId: comment.productId,
                        commentId,
                        userId,
                        productName: product.name,
                        emoji: emoji,
                        actionType: actionType,
                        reactions: updatedComment.reactions,
                    },
                    action: {
                        type: 'navigate',
                        url: `/products/${comment.productId}`,
                        params: {
                            commentId: commentId,
                            scrollTo: 'comments'
                        },
                        label: 'View Comment'
                    }
                });
            }
        }

        return updatedComment;
    }

    static async removeReaction(commentId, userId) {
        const comment = await commentRepository.getCommentById(commentId);
        if (!comment) throw new Error('Comment not found');

        comment.reactions.forEach(reaction => {
            const userIndex = reaction.users.indexOf(userId);
            if (userIndex !== -1) {
                reaction.users.splice(userIndex, 1);
            }
        });

        comment.reactions = comment.reactions.filter(reaction => reaction.users.length > 0);

        const updatedComment = await commentRepository.updateReactions(commentId, comment.reactions);

        const user = await commentRepository.getUserById(userId);
        const product = await commentRepository.getProductById(comment.productId);

        const socket = getIO();
        if (socket) {
            socket.emit('reactionRemoved', {
                commentId,
                reactions: updatedComment.reactions,
            });

            if (user && product) {
                socket.to('adminRoom').emit('adminNotification', {
                    type: 'comment_reactions_removed',
                    message: `${user.firstName} ${user.lastName} removed all reactions from a comment on "${product.name}"`,
                    data: {
                        productId: comment.productId,
                        commentId,
                        userId,
                        productName: product.name,
                        reactions: updatedComment.reactions,
                    },
                    action: {
                        type: 'navigate',
                        url: `/products/${comment.productId}`,
                        params: {
                            commentId: commentId,
                            scrollTo: 'comments'
                        },
                        label: 'View Comment'
                    }
                });
            }
        }

        return updatedComment;
    }
}

module.exports = CommentService;