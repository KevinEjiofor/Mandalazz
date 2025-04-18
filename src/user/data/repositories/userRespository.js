const user = require("../../../user/data/models/userModel");
const createUser = async (firstName,lastName, email, password) => {
    const newUser = new user({ firstName, lastName, email, password });
    await newUser.save();
    return newUser;
};

const findUserById = async (id) => {
    return User.findById(id).select('-password');
};

const logUserActivity = async (userId, action) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.activityLogs.push({ action });
    await user.save();
};

const getUserActivityLogs = async (userId) => {
    const user = await User.findById(userId).select('activityLogs');
    if (!user) throw new Error('User not found');
    return user.activityLogs;
};


module.exports = { createUser,findUserById, logUserActivity, getUserActivityLogs  };