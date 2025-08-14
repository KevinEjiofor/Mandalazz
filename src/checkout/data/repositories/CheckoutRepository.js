const Checkout = require('../models/checkoutModel');

class CheckoutRepository {
    static get SAFE_USER_FIELDS() {
        return 'firstName lastName email';
    }

    static get SAFE_PRODUCT_FIELDS() {
        return 'name description price images category brand inStock';
    }

    static get USER_EXCLUDED_FIELDS() {
        return '-password -_id -role -emailVerified -createdAt -updatedAt -resetPasswordPin -resetPasswordExpire -emailVerificationToken -emailVerificationExpire -activityLogs -__v';
    }

    // Helper method to remove _id from populated fields
    static sanitizeResponse(doc) {
        if (!doc) return doc;

        const obj = doc.toObject ? doc.toObject() : doc;

        // Remove user._id if user exists
        if (obj.user && obj.user._id) {
            delete obj.user._id;
        }

        // Remove product._id from products array
        if (obj.products && Array.isArray(obj.products)) {
            obj.products.forEach(productItem => {
                if (productItem.product && productItem.product._id) {
                    delete productItem.product._id;
                }
            });
        }

        return obj;
    }

    // Helper method to sanitize array of documents
    static sanitizeResponseArray(docs) {
        if (!Array.isArray(docs)) return docs;
        return docs.map(doc => this.sanitizeResponse(doc));
    }

    static create(data) {
        const checkout = new Checkout(data);
        return checkout.save();
    }

    static createMany(dataArray) {
        return Checkout.insertMany(dataArray);
    }

    static async findByIdSecure(id) {
        const doc = await Checkout.findById(id)
            .populate({
                path: 'user',
                select: 'firstName lastName email'
            })
            .populate({
                path: 'products.product',
                select: this.SAFE_PRODUCT_FIELDS
            });
        return this.sanitizeResponse(doc);
    }

    static async findByReferenceSecure(reference) {
        const doc = await Checkout.findOne({ paymentReference: reference })
            .populate({
                path: 'user',
                select: 'firstName lastName email'
            })
            .populate({
                path: 'products.product',
                select: this.SAFE_PRODUCT_FIELDS
            });
        return this.sanitizeResponse(doc);
    }

    static async findSecure(query = {}, options = {}) {
        let mongoQuery = Checkout.find(query)
            .populate({
                path: 'user',
                select: 'firstName lastName email'
            })
            .populate({
                path: 'products.product',
                select: this.SAFE_PRODUCT_FIELDS
            });

        if (options.sort) {
            mongoQuery = mongoQuery.sort(options.sort);
        } else {
            mongoQuery = mongoQuery.sort({ createdAt: -1 });
        }

        if (options.limit) {
            mongoQuery = mongoQuery.limit(options.limit);
        }

        if (options.skip) {
            mongoQuery = mongoQuery.skip(options.skip);
        }

        const docs = await mongoQuery;
        return this.sanitizeResponseArray(docs);
    }

    static async findOneSecure(query) {
        const doc = await Checkout.findOne(query)
            .populate({
                path: 'user',
                select: 'firstName lastName email'
            })
            .populate({
                path: 'products.product',
                select: this.SAFE_PRODUCT_FIELDS
            });
        return this.sanitizeResponse(doc);
    }

    static findByUserSecure(userId, options = {}) {
        const query = { user: userId };
        return this.findSecure(query, {
            sort: { createdAt: -1 },
            ...options
        });
    }

    static findWithPaginationSecure(query = {}, page = 1, limit = 10, options = {}) {
        const skip = (page - 1) * limit;

        return this.findSecure(query, {
            skip,
            limit,
            sort: { createdAt: -1 },
            ...options
        });
    }

    static findByStatusSecure(status, options = {}) {
        const query = { status };
        return this.findSecure(query, options);
    }

    static findByDeliveryStatusSecure(deliveryStatus, options = {}) {
        const query = { deliveryStatus };
        return this.findSecure(query, options);
    }

    static findByPaymentStatusSecure(paymentStatus, options = {}) {
        const query = { paymentStatus };
        return this.findSecure(query, options);
    }

    static findByDateRangeSecure(startDate, endDate, options = {}) {
        const query = {
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        };
        return this.findSecure(query, options);
    }

    static findByAmountRangeSecure(minAmount, maxAmount, options = {}) {
        const query = {
            totalAmount: {
                $gte: minAmount,
                $lte: maxAmount
            }
        };
        return this.findSecure(query, options);
    }

    static async updateByIdSecure(id, updates, options = { new: true }) {
        const doc = await Checkout.findByIdAndUpdate(id, updates, options)
            .populate({
                path: 'user',
                select: 'firstName lastName email'
            })
            .populate({
                path: 'products.product',
                select: this.SAFE_PRODUCT_FIELDS
            });
        return this.sanitizeResponse(doc);
    }

    static updateStatusSecure(id, status) {
        return this.updateByIdSecure(id, { status });
    }

    static updateDeliveryStatusSecure(id, deliveryStatus) {
        return this.updateByIdSecure(id, { deliveryStatus });
    }

    static updatePaymentStatusSecure(id, paymentStatus) {
        return this.updateByIdSecure(id, { paymentStatus });
    }

    static updateMultipleFieldsSecure(id, updates) {
        return this.updateByIdSecure(id, updates);
    }

    static updateTrackingInfoSecure(id, trackingNumber, trackingUrl) {
        return this.updateByIdSecure(id, { trackingNumber, trackingUrl });
    }

    static updateEstimatedDeliverySecure(id, estimatedDeliveryDate) {
        return this.updateByIdSecure(id, { estimatedDeliveryDate });
    }

    static updateMany(query, updates) {
        return Checkout.updateMany(query, updates);
    }

    static updateOne(query, updates) {
        return Checkout.updateOne(query, updates);
    }

    static deleteById(id) {
        return Checkout.deleteOne({ _id: id });
    }

    static deleteMany(query) {
        return Checkout.deleteMany(query);
    }

    static deleteOne(query) {
        return Checkout.deleteOne(query);
    }

    static softDeleteById(id) {
        return this.updateByIdSecure(id, { isDeleted: true, deletedAt: new Date() });
    }

    static restoreById(id) {
        return this.updateByIdSecure(id, { isDeleted: false, deletedAt: null });
    }

    static countDocuments(query = {}) {
        return Checkout.countDocuments(query);
    }

    static exists(query) {
        return Checkout.exists(query);
    }

    static getStatistics() {
        return Checkout.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);
    }

    static getDeliveryStatistics() {
        return Checkout.aggregate([
            {
                $group: {
                    _id: '$deliveryStatus',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);
    }

    static getPaymentStatistics() {
        return Checkout.aggregate([
            {
                $group: {
                    _id: '$paymentStatus',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);
    }

    static getUserStatistics(userId) {
        return Checkout.aggregate([
            {
                $match: { user: userId }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' }
                }
            }
        ]);
    }

    static getMonthlyStatistics(year = new Date().getFullYear()) {
        return Checkout.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(`${year}-01-01`),
                        $lt: new Date(`${year + 1}-01-01`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);
    }

    static getDailyStatistics(startDate, endDate) {
        return Checkout.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);
    }

    static getTopProducts(limit = 10) {
        return Checkout.aggregate([
            {
                $unwind: '$products'
            },
            {
                $group: {
                    _id: '$products.product',
                    totalQuantity: { $sum: '$products.quantity' },
                    totalOrders: { $sum: 1 }
                }
            },
            {
                $sort: { totalQuantity: -1 }
            },
            {
                $limit: limit
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            }
        ]);
    }

    static getRevenueByPeriod(period = 'monthly', year = new Date().getFullYear()) {
        const matchStage = {
            createdAt: {
                $gte: new Date(`${year}-01-01`),
                $lt: new Date(`${year + 1}-01-01`)
            },
            paymentStatus: 'completed'
        };

        const groupStage = period === 'daily'
            ? {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                },
                revenue: { $sum: '$totalAmount' },
                orderCount: { $sum: 1 }
            }
            : {
                _id: { $month: '$createdAt' },
                revenue: { $sum: '$totalAmount' },
                orderCount: { $sum: 1 }
            };

        return Checkout.aggregate([
            { $match: matchStage },
            { $group: groupStage },
            { $sort: { '_id': 1 } }
        ]);
    }

    static getDistinct(field, query = {}) {
        return Checkout.distinct(field, query);
    }

    static findWithCustomPopulate(query, populateOptions) {
        return Checkout.find(query).populate(populateOptions);
    }

    static searchCheckouts(searchTerm, options = {}) {
        const query = {
            $or: [
                { orderNumber: { $regex: searchTerm, $options: 'i' } },
                { paymentReference: { $regex: searchTerm, $options: 'i' } },
                { 'userDetails.email': { $regex: searchTerm, $options: 'i' } },
                { 'userDetails.phoneNumber': { $regex: searchTerm, $options: 'i' } }
            ]
        };
        return this.findSecure(query, options);
    }

    static findExpiredCheckouts(hoursOld = 24) {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - hoursOld);

        const query = {
            createdAt: { $lte: cutoffDate },
            paymentStatus: 'pending',
            status: { $nin: ['cancelled', 'completed'] }
        };

        return this.findSecure(query);
    }

    static findByReference(reference) {
        console.warn('⚠️ WARNING: findByReference exposes user _id. Use findByReferenceSecure instead.');
        return Checkout.findOne({ paymentReference: reference })
            .populate('user', this.SAFE_USER_FIELDS)
            .populate('products.product', this.SAFE_PRODUCT_FIELDS);
    }

    static findById(id) {
        console.warn('⚠️ WARNING: findById exposes user _id. Use findByIdSecure instead.');
        return Checkout.findById(id)
            .populate('user', this.SAFE_USER_FIELDS)
            .populate('products.product', this.SAFE_PRODUCT_FIELDS);
    }

    static find(query = {}) {
        console.warn('⚠️ WARNING: find exposes user _id. Use findSecure instead.');
        return Checkout.find(query)
            .populate('user', this.SAFE_USER_FIELDS)
            .populate('products.product', this.SAFE_PRODUCT_FIELDS);
    }

    static updateStatus(id, updates) {
        console.warn('⚠️ WARNING: updateStatus exposes user _id. Use updateStatusSecure instead.');
        return Checkout.findByIdAndUpdate(id, updates, { new: true })
            .populate('user', this.SAFE_USER_FIELDS)
            .populate('products.product', this.SAFE_PRODUCT_FIELDS);
    }
}

module.exports = CheckoutRepository;