const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
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
    phoneNumber: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true, // Still required in database
        match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
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
            required: true,
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
    isDefault: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    }
}, {
    timestamps: true
});

// Pre-save middleware to ensure only one default address per user
addressSchema.pre('save', async function(next) {
    if (this.isDefault) {
        await this.constructor.updateMany(
            { user: this.user, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

module.exports = mongoose.model('Address', addressSchema);