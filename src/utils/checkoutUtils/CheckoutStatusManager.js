const CheckoutRepo = require('../../checkout/data/repositories/CheckoutRepository');
const CartService = require('../../cart/services/CartService');
const CheckoutStatus = require('../../enums/checkoutStatus');
const { userNotifications } = require('../emailHandler');
const CheckoutNotifier = require('./CheckoutNotifier');
const DeliveryPaymentService = require('../../checkout/services/DeliveryPaymentService');

class CheckoutStatusManager {
    static calculateDeliveryDates(paymentType) {
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

        const cancelDays = paymentType === 'online_payment' ? 1 : 2;
        const cancellationDeadline = new Date(Date.now() + cancelDays * 86400000);

        return { estimatedDelivery, cancellationDeadline };
    }

    static async updatePaymentStatus(checkoutId, paymentStatus) {
        if (!['paid', 'failed'].includes(paymentStatus)) {
            throw new Error('Invalid payment status');
        }

        const existing = await CheckoutRepo.findByIdSecure(checkoutId);
        if (!existing) throw new Error('Checkout not found');

        if (existing.paymentType !== 'payment_on_delivery') {
            throw new Error('Payment status can only be updated for payment on delivery orders');
        }

        if (existing.paymentStatus === 'paid') {
            throw new Error('Order is already paid');
        }

        const updated = await CheckoutRepo.updatePaymentStatusSecure(checkoutId, paymentStatus);
        CheckoutNotifier.notifyUserAndAdmin(updated.user, updated, 'payment_status_update');

        return updated;
    }

    static async updateDeliveryStatus(checkoutId, newDeliveryStatus, note = null) {
        const validStatuses = Object.values(CheckoutStatus);
        if (!validStatuses.includes(newDeliveryStatus)) {
            throw new Error('Invalid delivery status');
        }

        const updated = await CheckoutRepo.updateDeliveryStatusSecure(checkoutId, newDeliveryStatus, note);

        await userNotifications(
            updated.userDetails.email,
            'Delivery Status Update',
            `Dear ${updated.userDetails.firstName}, your order ${updated.orderNumber} delivery status is now: ${newDeliveryStatus}`
        );

        CheckoutNotifier.notifyUserAndAdmin(updated.user, updated, 'delivery_status_update');
        return updated;
    }

    static async cancelCheckout(checkoutId) {
        const checkout = await CheckoutRepo.findByIdSecure(checkoutId);
        if (!checkout) throw new Error('Checkout not found');

        if (new Date() > new Date(checkout.cancellationDeadline)) {
            throw new Error('Cancellation deadline has passed');
        }

        if (checkout.paymentStatus === 'paid') {
            throw new Error('Cannot cancel a paid checkout');
        }

        await CheckoutRepo.deleteById(checkoutId);
        CheckoutNotifier.notifyUserAndAdmin(checkout.user, checkout, 'checkout_cancelled');

        return checkout;
    }

    static async getCheckouts(options = {}) {
        const checkouts = await CheckoutRepo.findSecure({}, options);

        return checkouts.map(checkout => ({
            orderNumber: checkout.orderNumber,
            totalAmount: checkout.totalAmount,
            paymentStatus: checkout.paymentStatus,
            deliveryStatus: checkout.deliveryStatus,
            createdAt: checkout.createdAt,
            deliveryStatusTimeline: checkout.deliveryStatusTimeline || [],
            paymentDetails: checkout.paymentDetails || {},
            user: {
                name: `${checkout.userDetails?.firstName || ""} ${checkout.userDetails?.lastName || ""}`.trim(),
                email: checkout.userDetails?.email || "",
                phone: checkout.userDetails?.phoneNumber || "",
                address: checkout.userDetails?.address || ""
            },
            products: checkout.products.map(productItem => ({
                productId: productItem._id || productItem.productId,
                name: productItem.name,
                description: productItem.description,
                price: productItem.price,
                category: productItem.category,
                brand: productItem.brand,
                color: productItem.color,
                size: productItem.size,
                quantity: productItem.quantity,
                images: productItem.images || []
            }))
        }));
    }

    static async getDeliveredOrders(userId) {
        const checkouts = await CheckoutRepo.findDeliveredOrdersSecure(userId);

        return checkouts.map(checkout => ({
            orderNumber: checkout.orderNumber,
            deliveryDate: checkout.updatedAt,
            totalAmount: checkout.totalAmount,
            userDetails: checkout.userDetails,
            products: checkout.products.map(productItem => {
                const product = productItem.product;

                if (!product) {
                    return {
                        color: productItem.color,
                        size: productItem.size,
                        quantity: productItem.quantity,
                        images: []
                    };
                }

                const matchingVariation = product.variations?.find(variation =>
                    variation.color.toLowerCase() === productItem.color.toLowerCase()
                );

                return {
                    product: product._id,
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    category: product.category,
                    brand: product.brand,
                    color: productItem.color,
                    size: productItem.size,
                    quantity: productItem.quantity,
                    images: matchingVariation?.images || []
                };
            })
        }));
    }

    static async getUserCheckouts(userId) {
        const checkouts = await CheckoutRepo.findByUserSecure(userId, {
            populate: [
                {
                    path: 'user',
                    select: 'firstName lastName email'
                },
                {
                    path: 'products.product',
                    select: 'name description price images category brand color'
                }
            ]
        });

        return checkouts.map(checkout => {
            const formattedProducts = checkout.products.map(product => ({
                ...product,
                product: product.product ? {
                    name: product.product.name,
                    description: product.product.description,
                    price: product.product.price,
                    images: product.product.images,
                    category: product.product.category,
                    brand: product.product.brand,
                    color: product.color
                } : null
            }));

            return {
                ...checkout,
                paymentDetails: checkout.paymentDetails || {},
                products: formattedProducts
            };
        });
    }

    static searchCheckouts(params) {
        const query = {};

        if (params.email) query['userDetails.email'] = { $regex: params.email, $options: 'i' };
        if (params.firstName) query['userDetails.firstName'] = { $regex: params.firstName, $options: 'i' };
        if (params.lastName) query['userDetails.lastName'] = { $regex: params.lastName, $options: 'i' };
        if (params.paymentStatus) query.paymentStatus = params.paymentStatus;
        if (params.paymentReference) query.paymentReference = params.paymentReference;
        if (params.deliveryStatus) query.deliveryStatus = params.deliveryStatus;
        if (params.orderNumber) query.orderNumber = { $regex: params.orderNumber, $options: 'i' };
        if (params.country) query['userDetails.country.name'] = { $regex: params.country, $options: 'i' };
        if (params.city) query['userDetails.city'] = { $regex: params.city, $options: 'i' };

        return CheckoutRepo.findSecure(query);
    }

    static async getLocationStatistics() {
        const checkouts = await CheckoutRepo.findSecure();
        const locationStats = {};

        checkouts.forEach(checkout => {
            const country = checkout.userDetails?.country?.name || 'Unknown';
            const city = checkout.userDetails?.city || 'Unknown';
            const key = `${country}-${city}`;

            if (!locationStats[key]) {
                locationStats[key] = {
                    country,
                    city,
                    totalOrders: 0,
                    totalAmount: 0,
                    paidOrders: 0,
                    pendingOrders: 0
                };
            }

            locationStats[key].totalOrders++;
            locationStats[key].totalAmount += parseFloat(checkout.totalAmount.toString());

            if (checkout.paymentStatus === 'paid') {
                locationStats[key].paidOrders++;
            } else if (checkout.paymentStatus === 'pending') {
                locationStats[key].pendingOrders++;
            }
        });

        return Object.values(locationStats);
    }

    static async getPaymentMethodStatistics() {
        const statsArr = await CheckoutRepo.getPaymentStatistics();
        const stats = {};
        statsArr.forEach(item => {
            stats[item._id] = {
                count: item.count,
                totalAmount: parseFloat(item.totalAmount?.toString?.() || item.totalAmount || 0)
            };
        });
        return stats;
    }

    static async getEnhancedPaymentMethodStatistics() {
        const [onlineStats, deliveryStats] = await Promise.all([
            this.getPaymentMethodStatistics(),
            DeliveryPaymentService.getDeliveryPaymentStats()
        ]);

        return {
            online_payments: onlineStats,
            delivery_payments: deliveryStats,
            combined: {
                total_online_orders: Object.values(onlineStats).reduce((sum, stat) => sum + stat.count, 0),
                total_delivery_orders: Object.values(deliveryStats).reduce((sum, stat) => sum + stat.count, 0),
                total_online_amount: Object.values(onlineStats).reduce((sum, stat) => sum + stat.totalAmount, 0),
                total_delivery_amount: Object.values(deliveryStats).reduce((sum, stat) => sum + stat.totalAmount, 0)
            }
        };
    }

    static async assignDeliveryAgent(checkoutId, agentInfo, newDeliveryStatus = 'out_for_delivery') {
        const validStatuses = Object.values(CheckoutStatus);
        if (!validStatuses.includes(newDeliveryStatus)) {
            throw new Error('Invalid delivery status');
        }

        const updateData = {
            deliveryStatus: newDeliveryStatus,
            deliveryAgent: agentInfo,
            $push: {
                deliveryStatusTimeline: {
                    status: newDeliveryStatus,
                    changedAt: new Date(),
                    note: `Assigned to ${agentInfo.name} (${agentInfo.phone})`
                }
            }
        };

        const updated = await CheckoutRepo.updateMultipleFieldsSecure(checkoutId, updateData);

        await userNotifications(
            updated.userDetails.email,
            'Delivery Agent Assigned',
            `Dear ${updated.userDetails.firstName},

Your order ${updated.orderNumber} is now out for delivery!

Delivery Agent Details:
- Name: ${agentInfo.name}
- Phone: ${agentInfo.phone}

The agent will contact you shortly to arrange delivery.

Payment Methods Available:
- Cash on delivery
- POS/Card payment
- Bank transfer

Thank you for choosing us!`
        );

        CheckoutNotifier.notifyUserAndAdmin(updated.user, updated, 'agent_assigned');
        return updated;
    }
}

module.exports = CheckoutStatusManager;