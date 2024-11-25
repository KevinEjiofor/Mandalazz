const user = require("../../../user/data/models/userModel");
const createAdmin = async (name, email, password) => {
    const newUser = new user({ firstName, lastNamee,email, password });
    await newUser.save();
    return newUser;
};

module.exports = { createAdmin};
