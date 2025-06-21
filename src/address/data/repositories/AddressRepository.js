const Address = require('../models/addressModel');

class AddressRepository {

    static create(data) {
        const address = new Address(data);
        return address.save();
    }

    static findById(id, userId = null) {
        const query = { _id: id, isActive: true };
        if (userId) {
            query.user = userId;
        }
        return Address.findOne(query).populate('user', 'firstName lastName email');
    }


    static findByUserId(userId) {
        return Address.find({ user: userId, isActive: true })
            .populate('user', 'firstName lastName email')
            .sort({ isDefault: -1, createdAt: -1 });
    }


    static findDefaultByUserId(userId) {
        return Address.findOne({ user: userId, isDefault: true, isActive: true })
            .populate('user', 'firstName lastName email');
    }


    static update(id, userId, updates) {
        return Address.findOneAndUpdate(
            { _id: id, user: userId, isActive: true },
            updates,
            { new: true }
        ).populate('user', 'firstName lastName email');
    }


    static delete(id, userId) {
        return Address.findOneAndUpdate(
            { _id: id, user: userId, isActive: true },
            { isActive: false },
            { new: true }
        );
    }


    static hardDelete(id, userId = null) {
        const query = { _id: id };
        if (userId) {
            query.user = userId;
        }
        return Address.findOneAndDelete(query);
    }


    static adminFind(query = {}) {
        return Address.find({ ...query, isActive: true })
            .populate('user', 'firstName lastName email')
            .sort({ createdAt: -1 });
    }


    static async setDefault(userId, addressId) {
        // First, unset all default addresses for this user
        await Address.updateMany(
            { user: userId, isActive: true },
            { isDefault: false }
        );

        // Then set the specified address as default
        return Address.findOneAndUpdate(
            { _id: addressId, user: userId, isActive: true },
            { isDefault: true },
            { new: true }
        ).populate('user', 'firstName lastName email');
    }


    static countByUser(userId) {
        return Address.countDocuments({ user: userId, isActive: true });
    }


    static async belongsToUser(addressId, userId) {
        const address = await Address.findOne({
            _id: addressId,
            user: userId,
            isActive: true
        });
        return !!address;
    }
}

module.exports = AddressRepository;