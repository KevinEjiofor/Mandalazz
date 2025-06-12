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

}

module.exports = new UserRepository();
