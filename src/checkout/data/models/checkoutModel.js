const mongoose = require('mongoose');
const CheckoutStatus = require('../../../config/checkoutStatus');

const checkoutSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        address: {
            type: String,
            required: true,
        },
        landmark: {
            type: String,
            required: false,
        },
        location: {
            lat: {
                type: Number,
                required: true,
            },
            lng: {
                type: Number,
                required: true,
            },
            placeId: {
                type: String,
                required: false,
            },
            formattedAddress: {
                type: String,
                required: false,
            }
        },
        country: {
            name: {
                type: String,
                required: true,
            },
            code: {
                type: String,
                required: false,
            }
        },
        city: {
            type: String,
            required: false,
        },
        state: {
            type: String,
            required: false,
        },
        postalCode: {
            type: String,
            required: false,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
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
    estimatedDeliveryDate: {
        type: Date,
        required: true,
    },
    actualDeliveryDate: {
        type: Date,
        required: false,
    },
    cancellationDeadline: {
        type: Date,
        required: true,
    },
    deliveryNotes: {
        type: String,
        required: false,
    },
    trackingNumber: {
        type: String,
        required: false,
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {

            if (ret.totalAmount) {
                ret.totalAmount = parseFloat(ret.totalAmount.toString());
            }
            return ret;
        }
    }
});


checkoutSchema.index({ user: 1, createdAt: -1 });

checkoutSchema.index({ 'userDetails.email': 1 });
checkoutSchema.index({ 'userDetails.country.name': 1 });
checkoutSchema.index({ 'userDetails.city': 1 });
checkoutSchema.index({ paymentStatus: 1 });
checkoutSchema.index({ deliveryStatus: 1 });


checkoutSchema.virtual('customerName').get(function() {
    return `${this.userDetails.firstName} ${this.userDetails.lastName}`;
});


checkoutSchema.virtual('deliveryAddressSummary').get(function() {
    const parts = [
        this.userDetails.address,
        this.userDetails.landmark,
        this.userDetails.city,
        this.userDetails.state,
        this.userDetails.country?.name
    ].filter(Boolean);

    return parts.join(', ');
});


checkoutSchema.methods.canBeCancelled = function() {
    return new Date() <= new Date(this.cancellationDeadline) &&
        this.paymentStatus !== 'paid' &&
        this.deliveryStatus === CheckoutStatus.PENDING;
};

checkoutSchema.methods