const {findAdminByName, findAdminByEmail} = require("../admin/data/repositories/adminRepository");

const checkIfAdminExists = async (name, email) => {

    const existingAdminByName = await findAdminByName(name);  // Pass name directly
    if (existingAdminByName) {
        throw new Error('Admin name is already taken. Please choose another name.');
    }

    const existingAdminByEmail = await findAdminByEmail(email);  // Pass email directly
    if (existingAdminByEmail) {
        throw new Error('Email is already in use. Please use a different email address.');
    }
};
module.exports ={checkIfAdminExists}
