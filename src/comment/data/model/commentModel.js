const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    firstName: String,
    lastName: String,
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reactions: [{
        emoji: String,
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }],
});

module.exports = mongoose.model('Comment', commentSchema);
