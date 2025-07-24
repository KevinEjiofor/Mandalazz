const mongoose = require('mongoose')
const User = require("../models/userModel");

class UserRepository {
    async createUser(firstName, lastName, email, password) {
        const newUser = new User({ firstName, lastName, email, password });
        await newUser.save();
        return newUser;
    }

    async findUserById(id) {
        return User.findById(id).select('-password');
    }

    async getUserWithPassword(id) {
        return User.findById(id);
    }

    async updatePassword(userId, hashedPassword) {
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { password: hashedPassword } },
            { new: true }
        );

        if (!user) throw new Error('User not found');
        return user;
    }

    async updateUserProfile(userId, updateData) {
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) throw new Error('User not found');
        return user;
    }

    async logUserActivity(userId, action) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        user.activityLogs.push({ action });
        await user.save();
    }

    async getUserActivityLogs(userId) {
        const user = await User.findById(userId).select('activityLogs');
        if (!user) throw new Error('User not found');
        return user.activityLogs;
    }

    async getUserByEmail(email) {
        return User.findOne({ email });
    }

    async checkEmailExists(email, excludeUserId = null) {
        const query = { email };
        if (excludeUserId) {
            query._id = { $ne: excludeUserId };
        }
        return User.findOne(query);
    }
}

module.exports = new UserRepository();