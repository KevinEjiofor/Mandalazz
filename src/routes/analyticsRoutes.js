const express = require('express');
const router = express.Router();
const AnalyticsController = require('../product/controllers/AnalyticsController');
const authMiddleware = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');

// Apply authentication and admin middleware to all routes
router.use(authMiddleware);
router.use(isAdmin);

router.get('/dashboard', AnalyticsController.getDashboardAnalytics);

router.get('/summary', AnalyticsController.getQuickSummary);

router.get('/sales', AnalyticsController.getTotalSales);
router.get('/revenue-by-payment', AnalyticsController.getRevenueByPaymentType);

router.get('/products', AnalyticsController.getProductAnalytics);
router.get('/top-products', AnalyticsController.getTopSellingProducts);

router.get('/orders', AnalyticsController.getOrderAnalytics);

router.get('/date-range', AnalyticsController.getAnalyticsByDateRange);

router.get('/monthly-sales', AnalyticsController.getMonthlySales);

router.get('/monthly-trend', AnalyticsController.getMonthlySalesTrend);

module.exports = router;