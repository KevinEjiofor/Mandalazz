const CheckoutRepo = require('../../checkout/data/repositories/CheckoutRepository');
const productRepo = require('../data/repositories/ProductRepository');
const CheckoutStatus = require('../../enums/checkoutStatus');
const Month = require('../../enums/Month');

class AnalyticsService {

    async getDashboardAnalytics() {
        try {
            const [
                totalSalesAfterDelivery,
                totalProducts,
                orderStatistics,
                revenueByPaymentType,
                topSellingProducts
            ] = await Promise.all([
                this.getTotalSalesAfterDelivery(),
                this.getTotalProducts(),
                this.getOrderStatistics(),
                this.getRevenueByPaymentType(),
                this.getTopSellingProducts(5)
            ]);

            return {
                sales: {
                    totalSalesAfterDelivery,
                    revenueByPaymentType
                },
                products: {
                    totalProducts,
                    topSellingProducts
                },
                orders: orderStatistics,
                generatedAt: new Date()
            };
        } catch (error) {
            throw new Error(`Failed to get dashboard analytics: ${error.message}`);
        }
    }

    async getTotalSalesAfterDelivery() {
        try {
            const deliveredOrders = await CheckoutRepo.find({
                deliveryStatus: CheckoutStatus.DELIVERED,
                paymentStatus: 'paid'
            });

            const totalAmount = deliveredOrders.reduce((sum, order) => {
                return sum + parseFloat(order.totalAmount.toString());
            }, 0);

            return {
                totalAmount: parseFloat(totalAmount.toFixed(2)),
                orderCount: deliveredOrders.length,
                currency: 'NGN'
            };
        } catch (error) {
            throw new Error(`Failed to calculate total sales: ${error.message}`);
        }
    }

    async getTotalProducts() {
        try {
            const [totalProducts, activeProducts, inactiveProducts] = await Promise.all([
                productRepo.countDocuments({}),
                productRepo.countDocuments({ isActive: true }),
                productRepo.countDocuments({ isActive: false })
            ]);

            return {
                total: totalProducts,
                active: activeProducts,
                inactive: inactiveProducts
            };
        } catch (error) {
            throw new Error(`Failed to get product count: ${error.message}`);
        }
    }

    async getOrderStatistics() {
        try {
            const [
                totalOrders,
                pendingOrders,
                deliveredOrders,
                underProcessOrders,
                outForDeliveryOrders,
                shippedOrders,
                cancelledOrders,
                paidOrders,
                unpaidOrders
            ] = await Promise.all([
                CheckoutRepo.find().then(orders => orders.length),
                CheckoutRepo.find({ deliveryStatus: CheckoutStatus.PENDING }).then(orders => orders.length),
                CheckoutRepo.find({ deliveryStatus: CheckoutStatus.DELIVERED }).then(orders => orders.length),
                CheckoutRepo.find({ deliveryStatus: CheckoutStatus.UNDER_PROCESS }).then(orders => orders.length),
                CheckoutRepo.find({ deliveryStatus: CheckoutStatus.OUT_FOR_DELIVERY }).then(orders => orders.length),
                CheckoutRepo.find({ deliveryStatus: CheckoutStatus.SHIPPED }).then(orders => orders.length),
                CheckoutRepo.find({ deliveryStatus: CheckoutStatus.CANCELLED }).then(orders => orders.length),
                CheckoutRepo.find({ paymentStatus: 'paid' }).then(orders => orders.length),
                CheckoutRepo.find({ paymentStatus: 'pending' }).then(orders => orders.length)
            ]);

            return {
                total: totalOrders,
                byDeliveryStatus: {
                    pending: pendingOrders,
                    delivered: deliveredOrders,
                    underProcess: underProcessOrders,
                    outForDelivery: outForDeliveryOrders,
                    shipped: shippedOrders,
                    cancelled: cancelledOrders
                },
                byPaymentStatus: {
                    paid: paidOrders,
                    unpaid: unpaidOrders
                },
                deliveryRate: totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100).toFixed(2) : 0,
                paymentRate: totalOrders > 0 ? ((paidOrders / totalOrders) * 100).toFixed(2) : 0
            };
        } catch (error) {
            throw new Error(`Failed to get order statistics: ${error.message}`);
        }
    }

    async getRevenueByPaymentType() {
        try {
            const [onlinePayments, codPayments] = await Promise.all([
                CheckoutRepo.find({
                    paymentType: 'online_payment',
                    paymentStatus: 'paid',
                    deliveryStatus: CheckoutStatus.DELIVERED
                }),
                CheckoutRepo.find({
                    paymentType: 'payment_on_delivery',
                    paymentStatus: 'paid',
                    deliveryStatus: CheckoutStatus.DELIVERED
                })
            ]);

            const onlineRevenue = onlinePayments.reduce((sum, order) => {
                return sum + parseFloat(order.totalAmount.toString());
            }, 0);

            const codRevenue = codPayments.reduce((sum, order) => {
                return sum + parseFloat(order.totalAmount.toString());
            }, 0);

            return {
                onlinePayment: {
                    revenue: parseFloat(onlineRevenue.toFixed(2)),
                    orderCount: onlinePayments.length
                },
                cashOnDelivery: {
                    revenue: parseFloat(codRevenue.toFixed(2)),
                    orderCount: codPayments.length
                },
                total: {
                    revenue: parseFloat((onlineRevenue + codRevenue).toFixed(2)),
                    orderCount: onlinePayments.length + codPayments.length
                }
            };
        } catch (error) {
            throw new Error(`Failed to get revenue by payment type: ${error.message}`);
        }
    }

    async getTopSellingProducts(limit = 5) {
        try {
            const deliveredOrders = await CheckoutRepo.find({
                deliveryStatus: CheckoutStatus.DELIVERED,
                paymentStatus: 'paid'
            });

            const productSales = {};

            deliveredOrders.forEach(order => {
                order.products.forEach(item => {
                    const productId = item.product.toString();
                    if (!productSales[productId]) {
                        productSales[productId] = {
                            productId,
                            productName: item.name,
                            totalQuantity: 0,
                            totalRevenue: 0
                        };
                    }
                    productSales[productId].totalQuantity += item.quantity;
                    productSales[productId].totalRevenue += item.quantity * parseFloat(item.price.toString());
                });
            });

            return Object.values(productSales)
                .sort((a, b) => b.totalRevenue - a.totalRevenue)
                .slice(0, limit)
                .map(product => ({
                    ...product,
                    totalRevenue: parseFloat(product.totalRevenue.toFixed(2))
                }));
        } catch (error) {
            throw new Error(`Failed to get top selling products: ${error.message}`);
        }
    }

    async getAnalyticsByDateRange(startDate, endDate) {
        try {
            if (!startDate || !endDate) {
                throw new Error('Start date and end date are required');
            }

            const orders = await CheckoutRepo.find({
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            });

            const deliveredOrders = orders.filter(order =>
                order.deliveryStatus === CheckoutStatus.DELIVERED && order.paymentStatus === 'paid'
            );

            const totalRevenue = deliveredOrders.reduce((sum, order) => {
                return sum + parseFloat(order.totalAmount.toString());
            }, 0);

            return {
                dateRange: {
                    startDate: new Date(startDate),
                    endDate: new Date(endDate)
                },
                totalOrders: orders.length,
                deliveredOrders: deliveredOrders.length,
                totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                averageOrderValue: deliveredOrders.length > 0
                    ? parseFloat((totalRevenue / deliveredOrders.length).toFixed(2))
                    : 0
            };
        } catch (error) {
            throw new Error(`Failed to get analytics by date range: ${error.message}`);
        }
    }

    /**
     * Get monthly sales data - can return trends or specific month
     * @param {Object} options - Configuration options
     * @param {number} options.months - Number of months for trend (default: 12)
     * @param {string} options.specificMonth - Specific month in YYYY-MM format or month name
     * @param {number} options.year - Year for specific month (required if specificMonth provided)
     * @returns {Array|Object} Monthly sales data
     */
    async getMonthlySales(options = {}) {
        try {
            const { months = 12, specificMonth, year } = options;

            // If specific month is requested
            if (specificMonth || year) {
                return await this.getSpecificMonthSales(specificMonth, year);
            }

            // Otherwise return monthly trend
            return await this.getMonthlySalesTrend(months);
        } catch (error) {
            throw new Error(`Failed to get monthly sales: ${error.message}`);
        }
    }

    /**
     * Get sales data for a specific month
     * @param {string} month - Month in YYYY-MM, MM, or month name format
     * @param {number} year - Year (required if month is in MM or name format)
     * @returns {Object} Specific month sales data
     */
    async getSpecificMonthSales(month, year) {
        try {
            let targetMonth;
            let targetYear;
            let targetMonthNum;

            // Handle different month formats
            if (month && month.includes('-')) {
                // Format: YYYY-MM
                targetMonth = month;
                [targetYear, targetMonthNum] = month.split('-').map(Number);
            } else if (month) {
                // Handle month names using Month enum
                const monthData = Month.getMonthByName(month);

                if (monthData) {
                    // It's a month name
                    targetMonthNum = monthData.number;
                    targetYear = year || new Date().getFullYear();
                } else {
                    // It's a number
                    targetMonthNum = parseInt(month);
                    targetYear = year || new Date().getFullYear();

                    if (!Month.isValidMonthNumber(targetMonthNum)) {
                        throw new Error('Invalid month number. Must be between 1 and 12');
                    }
                }

                targetMonth = `${targetYear}-${targetMonthNum.toString().padStart(2, '0')}`;
            } else if (year) {
                // Just year provided, get current month
                const currentMonth = new Date().getMonth() + 1;
                targetYear = parseInt(year);
                targetMonthNum = currentMonth;
                targetMonth = `${targetYear}-${currentMonth.toString().padStart(2, '0')}`;
            } else {
                throw new Error('Invalid month format. Use YYYY-MM, month name, or provide both month and year');
            }

            // Create date range for the specific month
            const startDate = new Date(targetYear, targetMonthNum - 1, 1);
            const endDate = new Date(targetYear, targetMonthNum, 0, 23, 59, 59, 999);

            const orders = await CheckoutRepo.find({
                createdAt: { $gte: startDate, $lte: endDate },
                deliveryStatus: CheckoutStatus.DELIVERED,
                paymentStatus: 'paid'
            });

            const totalRevenue = orders.reduce((sum, order) => {
                return sum + parseFloat(order.totalAmount.toString());
            }, 0);

            // Get month name using Month enum
            const monthData = Month.getMonthByNumber(targetMonthNum);

            return {
                month: targetMonth,
                monthName: monthData ? monthData.name : 'Unknown',
                year: targetYear,
                revenue: parseFloat(totalRevenue.toFixed(2)),
                orderCount: orders.length,
                averageOrderValue: orders.length > 0
                    ? parseFloat((totalRevenue / orders.length).toFixed(2))
                    : 0,
                dateRange: {
                    startDate,
                    endDate
                }
            };
        } catch (error) {
            throw new Error(`Failed to get specific month sales: ${error.message}`);
        }
    }

    /**
     * Get monthly sales trend over multiple months
     * @param {number} months - Number of months to include
     * @returns {Array} Monthly sales trend data
     */
    async getMonthlySalesTrend(months = 12) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);

            const orders = await CheckoutRepo.find({
                createdAt: { $gte: startDate, $lte: endDate },
                deliveryStatus: CheckoutStatus.DELIVERED,
                paymentStatus: 'paid'
            });

            // Group orders by month
            const monthlyData = {};

            orders.forEach(order => {
                const monthYear = order.createdAt.toISOString().slice(0, 7); // YYYY-MM format
                if (!monthlyData[monthYear]) {
                    monthlyData[monthYear] = {
                        month: monthYear,
                        revenue: 0,
                        orderCount: 0
                    };
                }
                monthlyData[monthYear].revenue += parseFloat(order.totalAmount.toString());
                monthlyData[monthYear].orderCount += 1;
            });

            // Convert to array and sort by month
            return Object.values(monthlyData)
                .map(data => ({
                    ...data,
                    revenue: parseFloat(data.revenue.toFixed(2)),
                    averageOrderValue: data.orderCount > 0
                        ? parseFloat((data.revenue / data.orderCount).toFixed(2))
                        : 0
                }))
                .sort((a, b) => a.month.localeCompare(b.month));
        } catch (error) {
            throw new Error(`Failed to get monthly sales trend: ${error.message}`);
        }
    }
}

module.exports = new AnalyticsService();