const user = require("../../../user/data/models/userModel");
const createUser = async (firstName,lastName, email, password) => {
    const newUser = new user({ firstName, lastName, email, password });
    await newUser.save();
    return newUser;
};

module.exports = { createUser };
