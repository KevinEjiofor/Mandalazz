const Checkout = require('../models/checkoutModel'); // This now returns a constructor

class CheckoutRepository {
    static create(data) {
        const checkout = new Checkout(data); // ✅ This now works
        return checkout.save();
    }

    static findByReference(reference) {
        return Checkout.findOne({ paymentReference: reference });
    }

    static findById(id) {
        return Checkout.findById(id).populate('user products.product');
    }

    static find(query = {}) {
        return Checkout.find(query).populate('user products.product');
    }

    static deleteById(id) {
        return Checkout.deleteOne({ _id: id });
    }

    static updateStatus(id, updates) {
        return Checkout.findByIdAndUpdate(id, updates, { new: true }).populate('user products.product');
    }
}

module.exports = CheckoutRepository;
