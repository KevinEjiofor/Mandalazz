const AnalyticsService = require('../services/AnalyticsService');
const Month = require('../../enums/Month');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler');

class AnalyticsController {
    static async getDashboardAnalytics(req, res) {
        try {
            const analytics = await AnalyticsService.getDashboardAnalytics();
            sendSuccessResponse(res, 'Dashboard analytics retrieved successfully', analytics);
        } catch (error) {
            console.error('Error in getDashboardAnalytics:', error);
            sendErrorResponse(res, error.message);
        }
    }

    static async getTotalSales(req, res) {
        try {
            const salesData = await AnalyticsService.getTotalSalesAfterDelivery();
            sendSuccessResponse(res, 'Total sales retrieved successfully', salesData);
        } catch (error) {
            console.error('Error in getTotalSales:', error);
            sendErrorResponse(res, error.message);
        }
    }

    static async getProductAnalytics(req, res) {
        try {
            const productData = await AnalyticsService.getTotalProducts();
            sendSuccessResponse(res, 'Product analytics retrieved successfully', productData);
        } catch (error) {
            console.error('Error in getProductAnalytics:', error);
            sendErrorResponse(res, error.message);
        }
    }

    static async getOrderAnalytics(req, res) {
        try {
            const orderData = await AnalyticsService.getOrderStatistics();
            sendSuccessResponse(res, 'Order analytics retrieved successfully', orderData);
        } catch (error) {
            console.error('Error in getOrderAnalytics:', error);
            sendErrorResponse(res, error.message);
        }
    }

    static async getRevenueByPaymentType(req, res) {
        try {
            const revenueData = await AnalyticsService.getRevenueByPaymentType();
            sendSuccessResponse(res, 'Revenue by payment type retrieved successfully', revenueData);
        } catch (error) {
            console.error('Error in getRevenueByPaymentType:', error);
            sendErrorResponse(res, error.message);
        }
    }

    static async getTopSellingProducts(req, res) {
        try {
            const { limit = 5 } = req.query;
            const limitNum = parseInt(limit);

            if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
                return sendErrorResponse(res, 'Limit must be a number between 1 and 50', 400);
            }

            const topProducts = await AnalyticsService.getTopSellingProducts(limitNum);
            sendSuccessResponse(res, 'Top selling products retrieved successfully', {
                limit: limitNum,
                products: topProducts
            });
        } catch (error) {
            console.error('Error in getTopSellingProducts:', error);
            sendErrorResponse(res, error.message);
        }
    }

    static async getAnalyticsByDateRange(req, res) {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return sendErrorResponse(res, 'Start date and end date are required', 400);
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return sendErrorResponse(res, 'Invalid date format. Use YYYY-MM-DD', 400);
            }

            if (start >= end) {
                return sendErrorResponse(res, 'Start date must be before end date', 400);
            }

            const daysDifference = (end - start) / (1000 * 60 * 60 * 24);
            if (daysDifference > 730) { // 2 years
                return sendErrorResponse(res, 'Date range cannot exceed 2 years', 400);
            }

            const analytics = await AnalyticsService.getAnalyticsByDateRange(start, end);
            sendSuccessResponse(res, 'Analytics by date range retrieved successfully', analytics);
        } catch (error) {
            console.error('Error in getAnalyticsByDateRange:', error);
            sendErrorResponse(res, error.message);
        }
    }

    static async getMonthlySales(req, res) {
        try {
            const { months, month, year } = req.query;

            // Validate inputs
            if (month && !AnalyticsController._isValidMonthFormat(month, year)) {
                return sendErrorResponse(res, 'Invalid month format. Use YYYY-MM or provide both month (MM) and year', 400);
            }

            if (months && (!AnalyticsController._isValidNumber(months, 1, 24))) {
                return sendErrorResponse(res, 'Months must be a number between 1 and 24', 400);
            }

            const options = {};

            if (month || year) {
                options.specificMonth = month;
                if (year) options.year = parseInt(year);
            } else {
                options.months = months ? parseInt(months) : 12;
            }

            const result = await AnalyticsService.getMonthlySales(options);

            // Determine response message and structure
            let message, responseData;
            if (month || year) {
                message = 'Monthly sales data retrieved successfully';
                responseData = result;
            } else {
                message = 'Monthly sales trend retrieved successfully';
                responseData = {
                    months: options.months,
                    data: result
                };
            }

            sendSuccessResponse(res, message, responseData);
        } catch (error) {
            console.error('Error in getMonthlySales:', error);
            sendErrorResponse(res, error.message);
        }
    }

    static async getMonthlySalesTrend(req, res) {
        try {
            const { months = 12 } = req.query;
            const monthsNum = parseInt(months);

            if (isNaN(monthsNum) || monthsNum < 1 || monthsNum > 24) {
                return sendErrorResponse(res, 'Months must be a number between 1 and 24', 400);
            }

            const trendData = await AnalyticsService.getMonthlySalesTrend(monthsNum);
            sendSuccessResponse(res, 'Monthly sales trend retrieved successfully', {
                months: monthsNum,
                data: trendData
            });
        } catch (error) {
            console.error('Error in getMonthlySalesTrend:', error);
            sendErrorResponse(res, error.message);
        }
    }

    static async getQuickSummary(req, res) {
        try {
            const [salesData, productData, orderData] = await Promise.all([
                AnalyticsService.getTotalSalesAfterDelivery(),
                AnalyticsService.getTotalProducts(),
                AnalyticsService.getOrderStatistics()
            ]);

            const summary = {
                totalSalesAmount: salesData.totalAmount,
                totalSalesOrders: salesData.orderCount,
                totalActiveProducts: productData.active,
                totalPendingOrders: orderData.byDeliveryStatus.pending,
                totalDeliveredOrders: orderData.byDeliveryStatus.delivered,
                deliveryRate: orderData.deliveryRate,
                paymentRate: orderData.paymentRate
            };

            sendSuccessResponse(res, 'Quick summary retrieved successfully', summary);
        } catch (error) {
            console.error('Error in getQuickSummary:', error);
            sendErrorResponse(res, error.message);
        }
    }

    static _isValidNumber(value, min, max) {
        const num = parseInt(value);
        return !isNaN(num) && num >= min && num <= max;
    }

    static _isValidMonthFormat(month, year) {
        if (!month) return !!year;

        if (month.includes('-')) {
            const [yearPart, monthPart] = month.split('-');
            const yearNum = parseInt(yearPart);
            const monthNum = parseInt(monthPart);

            return yearNum >= 2020 && yearNum <= new Date().getFullYear() + 1 &&
                Month.isValidMonthNumber(monthNum);
        }

        if (Month.isValidMonthName(month)) {
            if (year) {
                const yearNum = parseInt(year);
                return yearNum >= 2020 && yearNum <= new Date().getFullYear() + 1;
            }
            return true;
        }


        if (year) {
            const monthNum = parseInt(month);
            const yearNum = parseInt(year);

            return Month.isValidMonthNumber(monthNum) &&
                yearNum >= 2020 && yearNum <= new Date().getFullYear() + 1;
        }

        const monthNum = parseInt(month);
        return Month.isValidMonthNumber(monthNum);
    }
}

module.exports = AnalyticsController;