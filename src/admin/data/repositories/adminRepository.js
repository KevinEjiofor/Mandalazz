const Admin = require('../models/adminModel');
const mongoose = require('mongoose');


const findAdminByName = async (name) => {
    return Admin.findOne({name});
};

const findAdminByEmail = async (email) => {
    return Admin.findOne({email});
};

const createAdmin = async (name, email, password) => {
    const newAdmin = new Admin({ name, email, password });
    await newAdmin.save();
    return newAdmin;
};

module.exports = { findAdminByEmail, createAdmin, findAdminByName};