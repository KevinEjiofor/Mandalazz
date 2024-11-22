const express = require('express');
const { loginAdmin, createAdmin } = require('../admin/controllers/adminAuthController');

const router = express.Router();

// Admin login route
router.post('/login', loginAdmin);

// Admin creation route (setup)
router.post('/create-admin', createAdmin);

module.exports = router;
