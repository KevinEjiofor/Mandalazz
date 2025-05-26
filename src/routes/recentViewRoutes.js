const express = require('express');
const router = express.Router();
const recentViewController = require('../recentView/controllers/RecentViewController');
const optionalAuthMiddleware = require('../middlewares/optionalAuthMiddleware')


// POST /api/recent-views
router.post('/', optionalAuthMiddleware, recentViewController.addRecentView);

// GET /api/recent-views
router.get('/', optionalAuthMiddleware, recentViewController.fetchRecentViews);

module.exports = router;
