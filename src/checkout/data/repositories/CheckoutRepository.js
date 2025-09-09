const Checkout = require('../models/checkoutModel');

class CheckoutRepository {
    static get SAFE_USER_FIELDS() {
        return 'firstName lastName email';
    }

    static get SAFE_PRODUCT_FIELDS() {

        return '_id name description price images category brand inStock variations';
    }

    static get USER_EXCLUDED_FIELDS() {
        return '-password -_id -role -emailVerified -createdAt -updatedAt -resetPasswordPin -resetPasswordExpire -emailVerificationToken -emailVerificationExpire -activityLogs -__v';
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

    static async findByUserSecure(userId, options = {}) {
        const query = { user: userId };
        let mongoQuery = Checkout.find(query)
            .populate({
                path: 'user',
                select: 'firstName lastName email'
            })
            .populate({
                path: 'products.product',
                select: 'name description price category brand variations'
            })
            .sort({ createdAt: -1 });

        if (options.limit) {
            mongoQuery = mongoQuery.limit(options.limit);
        }

        const docs = await mongoQuery;
        return this.sanitizeResponseArray(docs);
    }
    static sanitizeResponse(doc) {
        if (!doc) return doc;

        const obj = doc.toObject ? doc.toObject() : doc;

        // Remove user._id if user exists
        if (obj.user && obj.user._id) {
            delete obj.user._id;
        }

        // Format products array with required details
        if (obj.products && Array.isArray(obj.products)) {
            obj.products = obj.products.map(productItem => {
                if (!productItem.product) return productItem;

                // Find the variation matching the selected color
                const matchingVariation = productItem.product.variations?.find(v =>
                    v.color.toLowerCase() === productItem.color.toLowerCase()
                );

                return {
                    _id: productItem.product._id,
                    productId: productItem.product._id, // ✅ Add this for consistency
                    name: productItem.product.name,
                    description: productItem.product.description,
                    price: productItem.product.price,
                    category: productItem.product.category,
                    brand: productItem.product.brand,
                    color: productItem.color,
                    size: productItem.size,
                    quantity: productItem.quantity,
                    images: matchingVariation?.images || []
                };
            });
        }

        return obj;
    }
    static async findDeliveredOrdersSecure(userId) {
        const query = {
            user: userId,
            deliveryStatus: 'delivered'
        };

        let mongoQuery = Checkout.find(query)
            .populate({
                path: 'products.product',
                select: 'name description price category brand variations' // we’ll still populate variations
            })
            .sort({ updatedAt: -1 });

        const docs = await mongoQuery;

        return docs.map(doc => {
            if (!doc) return doc;

            const obj = doc.toObject ? doc.toObject() : doc;

            if (obj.products && Array.isArray(obj.products)) {
                obj.products = obj.products.map(productItem => {
                    if (!productItem.product) return productItem;

                    return {
                        product: {
                            _id: productItem.product._id,
                            name: productItem.product.name,
                            description: productItem.product.description,
                            price: productItem.product.price,
                            category: productItem.product.category,
                            brand: productItem.product.brand,
                            variations: productItem.product.variations || []
                        },
                        color: productItem.color,
                        size: productItem.size,
                        quantity: productItem.quantity
                    };
                });
            }

            return obj;
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

    static updateStatusSecure(id, updates) {
        return this.updateByIdSecure(id, updates);
    }

    static async updateDeliveryStatusSecure(id, deliveryStatus, note = null) {
        // Push new status to deliveryStatusTimeline atomically
        const update = {
            deliveryStatus,
            $push: {
                deliveryStatusTimeline: {
                    status: deliveryStatus,
                    changedAt: new Date(),
                    ...(note ? { note } : {})
                }
            }
        };
        const doc = await Checkout.findByIdAndUpdate(id, update, { new: true })
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

    static async updateCheckoutUserDetailsById(checkoutId, newUserDetails) {
        const doc = await Checkout.findByIdAndUpdate(
            checkoutId,
            { userDetails: newUserDetails },
            { new: true }
        )
        .populate({
            path: 'user',
            select: this.SAFE_USER_FIELDS
        })
        .populate({
            path: 'products.product',
            select: this.SAFE_PRODUCT_FIELDS
        });
        return this.sanitizeResponse(doc);
    }
}

module.exports = CheckoutRepository;
