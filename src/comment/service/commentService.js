const Comment = require('../data/model/commentModel');
const Product = require('../../product/data/models/productModel');
const User = require('../../user/data/models/userModel');
const { getIO } = require("../../utils/socketHandler");
const NotificationService = require('../../notification/service/NotificationService');

class CommentService {
    static async addComment(productId, userId, commentText) {
        const product = await Product.findById(productId);
        if (!product) throw new Error('Product not found');

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const comment = new Comment({
            user: userId,
            firstName: user.firstName,
            lastName: user.lastName,
            comment: commentText,
        });

        await comment.save();

        product.comments.push(comment._id);
        await product.save();

        const socket = getIO();
        if (socket) {
            // Emit to all users viewing the product
            socket.emit('commentAdded', {
                productId,
                comment: {
                    firstName: comment.firstName,
                    lastName: comment.lastName,
                    comment: comment.comment,
                    createdAt: comment.createdAt,
                },
            });

            // Send to admin room for notifications
            socket.to('adminRoom').emit('adminNotification', {
                type: 'comment_added',
                message: `${user.firstName} ${user.lastName} commented on product ${product.name}`,
                data: {
                    productId,
                    commentId: comment._id,
                    userId,
                    productName: product.name,
                    comment: commentText,
                }
            });
        }

        // Create a persistent notification for admin
        await NotificationService.addNotification(
            'comment_added',
            `${user.firstName} ${user.lastName} commented on product ${product.name}`,
            {
                productId,
                commentId: comment._id,
                userId,
                productName: product.name,
                comment: commentText,
            }
        );

        return {
            firstName: user.firstName,
            lastName: user.lastName,
            comment: comment.comment,
            createdAt: comment.createdAt,
        };
    }

    static async deleteComment(productId, commentId, userId, isAdmin) {
        const product = await Product.findById(productId);
        if (!product) throw new Error('Product not found');

        const comment = await Comment.findById(commentId);
        if (!comment) throw new Error('Comment not found');

        if (comment.user.toString() !== userId && !isAdmin) {
            throw new Error('Unauthorized');
        }

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        await Comment.findByIdAndDelete(commentId);

        product.comments = product.comments.filter(
            (id) => id.toString() !== commentId
        );
        await product.save();

        const socket = getIO();
        if (socket) {
            socket.emit('commentDeleted', {
                productId,
                commentId,
                user: {
                    firstName: comment.firstName,
                    lastName: comment.lastName
                }
            });

            // Notify admin about deletion
            if (!isAdmin) {
                socket.to('adminRoom').emit('adminNotification', {
                    type: 'comment_deleted',
                    message: `${user.firstName} ${user.lastName} deleted a comment on product ${product.name}`,
                    data: {
                        productId,
                        commentId,
                        productName: product.name,
                    }
                });

                // Create persistent notification
                await NotificationService.addNotification(
                    'comment_deleted',
                    `${user.firstName} ${user.lastName} deleted a comment on product ${product.name}`,
                    {
                        productId,
                        commentId,
                        productName: product.name,
                    }
                );
            }
        }

        return {
            firstName: comment.firstName,
            lastName: comment.lastName,
            comment: comment.comment,
            createdAt: comment.createdAt,
        };
    }

    static async getComments(productId) {
        const product = await Product.findById(productId).populate('comments');
        if (!product) throw new Error('Product not found');

        const populatedComments = await Comment.find({ _id: { $in: product.comments } });

        return populatedComments.map(c => ({
            firstName: c.firstName,
            lastName: c.lastName,
            comment: c.comment,
            createdAt: c.createdAt,
            totalLikes: c.likes.length,
            reactions: c.reactions.map(r => ({
                emoji: r.emoji,
                count: r.users.length
            }))
        }));
    }

    static async updateComment(productId, commentId, userId, updatedText, isAdmin) {
        const product = await Product.findById(productId);
        if (!product) throw new Error('Product not found');

        const commentExistsInProduct = product.comments.some(
            (id) => id.toString() === commentId
        );
        if (!commentExistsInProduct) throw new Error('Comment not associated with this product');

        const comment = await Comment.findById(commentId);
        if (!comment) throw new Error('Comment not found');

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const TEN_MINUTES = 10 * 60 * 1000;
        const now = Date.now();
        const createdAt = new Date(comment.createdAt).getTime();
        if (now - createdAt > TEN_MINUTES && !isAdmin) {
            throw new Error('Edit window has expired');
        }

        if (comment.user.toString() !== userId && !isAdmin) {
            throw new Error('Unauthorized');
        }

        comment.comment = updatedText;
        await comment.save();

        const socket = getIO();
        if (socket) {
            socket.emit('commentUpdated', {
                productId,
                commentId,
                updatedComment: {
                    comment: comment.comment,
                    updatedAt: comment.updatedAt || new Date(),
                }
            });

            // Notify admin about the update (if not by admin)
            if (!isAdmin) {
                socket.to('adminRoom').emit('adminNotification', {
                    type: 'comment_updated',
                    message: `${user.firstName} ${user.lastName} updated a comment on product ${product.name}`,
                    data: {
                        productId,
                        commentId,
                        productName: product.name,
                        updatedComment: updatedText
                    }
                });

                // Create persistent notification
                await NotificationService.addNotification(
                    'comment_updated',
                    `${user.firstName} ${user.lastName} updated a comment on product ${product.name}`,
                    {
                        productId,
                        commentId,
                        productName: product.name,
                        updatedComment: updatedText
                    }
                );
            }
        }

        return {
            firstName: comment.firstName,
            lastName: comment.lastName,
            comment: comment.comment,
            createdAt: comment.createdAt,
        };
    }

    static async toggleLike(commentId, userId) {
        const comment = await Comment.findById(commentId);
        if (!comment) throw new Error('Comment not found');

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const product = await Product.findOne({ comments: commentId });
        if (!product) throw new Error('Associated product not found');

        const alreadyLiked = comment.likes.includes(userId);
        if (alreadyLiked) {
            comment.likes = comment.likes.filter(id => id.toString() !== userId);
        } else {
            comment.likes.push(userId);
        }

        await comment.save();

        const socket = getIO();
        if (socket) {
            socket.emit('commentLiked', {
                commentId,
                userId,
                liked: !alreadyLiked,
                totalLikes: comment.likes.length,
            });

            // Only notify admin about new likes (not unlikes)
            if (!alreadyLiked) {
                socket.to('adminRoom').emit('adminNotification', {
                    type: 'comment_liked',
                    message: `${user.firstName} ${user.lastName} liked a comment on product ${product.name}`,
                    data: {
                        productId: product._id,
                        commentId,
                        userId,
                        productName: product.name,
                    }
                });

                // Create persistent notification for likes
                await NotificationService.addNotification(
                    'comment_liked',
                    `${user.firstName} ${user.lastName} liked a comment on product ${product.name}`,
                    {
                        productId: product._id,
                        commentId,
                        userId,
                        productName: product.name,
                    }
                );
            }
        }

        return { liked: !alreadyLiked, totalLikes: comment.likes.length };
    }

    static async reactWithEmoji(commentId, userId, emoji) {
        const comment = await Comment.findById(commentId);
        if (!comment) throw new Error('Comment not found');

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const product = await Product.findOne({ comments: commentId });
        if (!product) throw new Error('Associated product not found');

        const existingReactionIndex = comment.reactions.findIndex(
            r => r.users.includes(userId)
        );

        let message;
        let isNewReaction = false;

        if (existingReactionIndex !== -1) {
            const existing = comment.reactions[existingReactionIndex];

            if (existing.emoji === emoji) {
                existing.users = existing.users.filter(id => id.toString() !== userId);
                if (existing.users.length === 0) {
                    comment.reactions.splice(existingReactionIndex, 1);
                }
                message = 'Reaction removed successfully';
            } else {
                existing.users = existing.users.filter(id => id.toString() !== userId);
                if (existing.users.length === 0) {
                    comment.reactions.splice(existingReactionIndex, 1);
                }

                let newReaction = comment.reactions.find(r => r.emoji === emoji);
                if (!newReaction) {
                    comment.reactions.push({ emoji, users: [userId] });
                } else {
                    newReaction.users.push(userId);
                }

                message = 'Reaction updated successfully';
                isNewReaction = true;
            }
        } else {
            let newReaction = comment.reactions.find(r => r.emoji === emoji);
            if (!newReaction) {
                comment.reactions.push({ emoji, users: [userId] });
            } else {
                newReaction.users.push(userId);
            }
            message = 'Reaction added successfully';
            isNewReaction = true;
        }

        await comment.save();

        const socket = getIO();
        if (socket) {
            socket.emit('commentReacted', {
                commentId,
                reactions: comment.reactions.map(r => ({
                    emoji: r.emoji,
                    count: r.users.length
                }))
            });

            // Only notify admin about new reactions (not reaction removals)
            if (isNewReaction) {
                socket.to('adminRoom').emit('adminNotification', {
                    type: 'comment_reacted',
                    message: `${user.firstName} ${user.lastName} reacted with ${emoji} on a comment on product ${product.name}`,
                    data: {
                        productId: product._id,
                        commentId,
                        userId,
                        emoji,
                        productName: product.name,
                    }
                });

                // Create persistent notification
                await NotificationService.addNotification(
                    'comment_reacted',
                    `${user.firstName} ${user.lastName} reacted with ${emoji} on a comment on product ${product.name}`,
                    {
                        productId: product._id,
                        commentId,
                        userId,
                        emoji,
                        productName: product.name,
                    }
                );
            }
        }

        return {
            message,
            reactions: comment.reactions.map(r => ({
                emoji: r.emoji,
                count: r.users.length
            }))
        };
    }

    static async removeReaction(commentId, userId) {
        const comment = await Comment.findById(commentId);
        if (!comment) throw new Error('Comment not found');

        let removed = false;

        comment.reactions = comment.reactions.map(reaction => {
            const filteredUsers = reaction.users.filter(id => id.toString() !== userId);
            if (filteredUsers.length !== reaction.users.length) {
                removed = true;
            }
            return { ...reaction.toObject(), users: filteredUsers };
        }).filter(reaction => reaction.users.length > 0);

        if (!removed) throw new Error('No reaction found to remove');

        await comment.save();

        const socket = getIO();
        if (socket) {
            socket.emit('reactionRemoved', {
                commentId,
                reactions: comment.reactions.map(r => ({
                    emoji: r.emoji,
                    count: r.users.length
                }))
            });
        }

        return {
            message: 'Reaction removed successfully',
            reactions: comment.reactions.map(r => ({
                emoji: r.emoji,
                count: r.users.length
            }))
        };
    }
}

module.exports = CommentService;