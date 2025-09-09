const { getIO } = require('../socketHandler');
const NotificationService = require('../../notification/service/NotificationService');

class CheckoutNotifier {
    static notifyUserAndAdmin(user, checkout, eventType, reference = null) {
        const socket = getIO();

        const customerName = checkout.userDetails
            ? `${checkout.userDetails.firstName} ${checkout.userDetails.lastName}`
            : `${user.firstName} ${user.lastName}`;

        const message = `${customerName} - ${eventType.replace(/_/g, ' ')} - Order ${checkout.orderNumber}`;

        const payload = {
            checkoutId: checkout._id,
            orderNumber: checkout.orderNumber,
            customerName,
            firstName: checkout.userDetails?.firstName || user.firstName,
            lastName: checkout.userDetails?.lastName || user.lastName,
            email: checkout.userDetails?.email || user.email,
            address: checkout.userDetails?.address,
            country: checkout.userDetails?.country?.name,
            city: checkout.userDetails?.city,
            paymentType: checkout.paymentType,
            paymentStatus: checkout.paymentStatus,
            deliveryStatus: checkout.deliveryStatus,
            totalAmount: checkout.totalAmount,
            ...(reference && { paymentReference: reference }),
        };

        if (socket) {
            socket.to('adminRoom').emit('adminNotification', {
                type: eventType,
                message,
                data: payload
            });
        }

        NotificationService.addNotification(eventType, message, payload);
    }
}

module.exports = CheckoutNotifier;