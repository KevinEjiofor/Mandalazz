const mongoose = require('mongoose');
const RoleEnum = require('../../../config/roleEnum');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },
    imageUrl: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },

});

module.exports = mongoose.model('Product', productSchema);
