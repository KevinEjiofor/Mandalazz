const mongoose = require('mongoose');
const CheckoutStatus = require('../../../enums/checkoutStatus');

const checkoutSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        orderNumber: {
            type: String,
            unique: true, // ✅ keep uniqueness here
            required: true,
        },
        products: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                size: {
                    type: String,
                    required: true,
                    trim: true,
                },
                color: {
                    type: String,
                    required: true,
                    trim: true,
                },
            },
        ],
        totalAmount: {
            type: mongoose.Schema.Types.Decimal128,
            required: true,
        },
        deliveryStatus: {
            type: String,
            enum: Object.values(CheckoutStatus),
            default: CheckoutStatus.PENDING,
        },
        userDetails: {
            firstName: { type: String, required: true, trim: true },
            lastName: { type: String, required: true, trim: true },
            address: { type: String, required: true },
            landmark: { type: String },
            location: {
                lat: { type: Number, required: true },
                lng: { type: Number, required: true },
                placeId: { type: String },
                formattedAddress: { type: String },
            },
            country: {
                name: { type: String, required: true },
                code: { type: String },
            },
            city: { type: String },
            state: { type: String },
            postalCode: { type: String },
            phoneNumber: { type: String, required: true },
            email: {
                type: String,
                match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
                required: true,
            },
        },
        paymentType: {
            type: String,
            enum: ['payment_on_delivery', 'online_payment'],
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending',
        },
        paymentReference: {
            type: String,
            unique: true,
            sparse: true,
        },
        estimatedDeliveryDate: { type: Date, required: true },
        actualDeliveryDate: { type: Date },
        cancellationDeadline: { type: Date, required: true },
        deliveryNotes: { type: String },
        trackingNumber: { type: String },

        deliveryStatusTimeline: [
            {
                status: { type: String, required: true },
                changedAt: { type: Date, default: Date.now },
                note: { type: String },
            },
        ],

        // ✅ keep paymentDetails inside schema
        paymentDetails: {
            method: {
                type: String,
                enum: [
                    // Online payment methods
                    'card', 'bank_transfer', 'ussd', 'qr', 'mobile_money', 'eft',
                    // Delivery payment methods
                    'cash_on_delivery', 'pos_on_delivery', 'transfer_on_delivery',
                ],
            },
            channel: {
                type: String, // e.g., 'card', 'dedicated_nuban', 'bank_transfer', 'cash', 'pos'
            },

            // Online payment specific fields
            cardType: { type: String },
            last4: { type: String },
            bank: { type: String },
            brand: { type: String },
            countryCode: { type: String },
            authorizationCode: { type: String },
            bin: { type: String },
            reusable: { type: Boolean },
            signature: { type: String },

            // Delivery payment specific fields
            deliveryPaymentDetails: {
                actualMethod: {
                    type: String,
                    enum: ['cash', 'pos', 'transfer'],
                    required: function () {
                        return (
                            this.parent().paymentType === 'payment_on_delivery' &&
                            this.parent().paymentStatus === 'paid'
                        );
                    },
                },
                posTerminal: { type: String }, // POS terminal ID if applicable
                transferReference: { type: String }, // Bank transfer reference
                receivedBy: { type: String }, // Delivery agent who received payment
                receivedAt: { type: Date }, // When payment was received
                confirmedBy: { type: String }, // Admin who confirmed the payment
                notes: { type: String }, // Additional notes about the payment
            },
        },

        // Track who handled the delivery
        deliveryAgent: {
            name: { type: String },
            phone: { type: String },
            agentId: { type: String },
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: function (doc, ret) {
                if (ret.totalAmount) {
                    ret.totalAmount = parseFloat(ret.totalAmount.toString());
                }
                return ret;
            },
        },
    }
);

// Generate order number before saving
checkoutSchema.pre('save', function (next) {
    if (!this.orderNumber) {
        const timestamp = Date.now().toString();
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.orderNumber = `ORD-${timestamp}-${randomStr}`;
    }
    next();
});

// ✅ Useful indexes
checkoutSchema.index({ user: 1, createdAt: -1 });
checkoutSchema.index({ 'userDetails.email': 1 });
checkoutSchema.index({ 'userDetails.country.name': 1 });
checkoutSchema.index({ 'userDetails.city': 1 });
checkoutSchema.index({ paymentStatus: 1 });
checkoutSchema.index({ deliveryStatus: 1 });

// Virtual fields
checkoutSchema.virtual('customerName').get(function () {
    return `${this.userDetails.firstName} ${this.userDetails.lastName}`;
});

checkoutSchema.virtual('deliveryAddressSummary').get(function () {
    const parts = [
        this.userDetails.address,
        this.userDetails.landmark,
        this.userDetails.city,
        this.userDetails.state,
        this.userDetails.country?.name,
    ].filter(Boolean);

    return parts.join(', ');
});
// Add these indexes to your checkout schema for better performance
checkoutSchema.index({ paymentReference: 1 });
checkoutSchema.index({ paymentStatus: 1, createdAt: 1 });
checkoutSchema.index({ paymentType: 1, paymentStatus: 1 });

// Add these virtuals and methods to your schema
checkoutSchema.virtual('isPaymentVerified').get(function () {
    return this.paymentStatus === 'paid' && this.paymentDetails;
});

checkoutSchema.virtual('paymentMethodDisplay').get(function () {
    if (!this.paymentDetails || !this.paymentDetails.method) return 'Unknown';

    const methodMap = {
        'card': 'Credit/Debit Card',
        'bank_transfer': 'Bank Transfer',
        'ussd': 'USSD',
        'qr': 'QR Code',
        'mobile_money': 'Mobile Money',
        'eft': 'Electronic Funds Transfer',
        'cash_on_delivery': 'Cash on Delivery',
        'pos_on_delivery': 'POS on Delivery',
        'transfer_on_delivery': 'Transfer on Delivery'
    };

    return methodMap[this.paymentDetails.method] || this.paymentDetails.method;
});

checkoutSchema.methods.canRetryPayment = function () {
    return this.paymentStatus === 'failed' &&
        this.paymentType === 'online_payment' &&
        new Date() < new Date(this.cancellationDeadline);
};

checkoutSchema.methods.getPaymentRetryUrl = async function () {
    if (!this.canRetryPayment()) return null;

    try {
        const { data: { authorization_url } = {} } = await initializePayment(
            this.userDetails.email,
            parseFloat(this.totalAmount.toString()),
            { reference: `retry_${this.paymentReference || Date.now()}` }
        );

        return authorization_url;
    } catch (error) {
        console.error('Error generating retry URL:', error);
        return null;
    }
};
// Instance methods
checkoutSchema.methods.canBeCancelled = function () {
    return (
        new Date() <= new Date(this.cancellationDeadline) &&
        this.paymentStatus !== 'paid' &&
        this.deliveryStatus === CheckoutStatus.PENDING
    );
};

module.exports = mongoose.model('Checkout', checkoutSchema);
