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
            // Convert Decimal128 to number for JSON response
            if (ret.totalAmount) {
                ret.totalAmount = parseFloat(ret.totalAmount.toString());
            }
            return ret;
        }
    }
});

// Indexes for better query performance
checkoutSchema.index({ user: 1, createdAt: -1 });
checkoutSchema.index({ paymentReference: 1 });
checkoutSchema.index({ 'userDetails.email': 1 });
checkoutSchema.index({ 'userDetails.country.name': 1 });
checkoutSchema.index({ 'userDetails.city': 1 });
checkoutSchema.index({ paymentStatus: 1 });
checkoutSchema.index({ deliveryStatus: 1 });

// Virtual for customer full name
checkoutSchema.virtual('customerName').get(function() {
    return `${this.userDetails.firstName} ${this.userDetails.lastName}`;
});

// Virtual for delivery address summary
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

// Method to check if checkout can be cancelled
checkoutSchema.methods.canBeCancelled = function() {
    return new Date() <= new Date(this.cancellationDeadline) &&
        this.paymentStatus !== 'paid' &&
        this.deliveryStatus === CheckoutStatus.PENDING;
};

// Method to check if checkout is delivered
checkoutSchema.methods.isDelivered = function() {
    return this.deliveryStatus === CheckoutStatus.DELIVERED;
};

// Static method to get location statistics
checkoutSchema.statics.getLocationStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: {
                    country: '$userDetails.country.name',
                    city: '$userDetails.city'
                },
                totalOrders: { $sum: 1 },
                totalAmount: { $sum: { $toDouble: '$totalAmount' } },
                paidOrders: {
                    $sum: {
                        $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0]
                    }
                },
                pendingOrders: {
                    $sum: {
                        $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                country: '$_id.country',
                city: '$_id.city',
                totalOrders: 1,
                totalAmount: 1,
                paidOrders: 1,
                pendingOrders: 1,
                averageOrderValue: { $divide: ['$totalAmount', '$totalOrders'] }
            }
        },
        {
            $sort: { totalOrders: -1 }
        }
    ]);
};

module.exports = mongoose.model('Checkout', checkoutSchema);