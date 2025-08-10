const CheckoutStatus = Object.freeze({

        PENDING: 'pending',
        UNDER_PROCESS: 'under_process',
        OUT_FOR_DELIVERY: 'out_for_delivery',
        DELIVERED: 'delivered',
        SHIPPED: 'shipped',
        CANCELLED: 'cancelled'


});

module.exports = CheckoutStatus;
