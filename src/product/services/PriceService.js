const mongoose = require('mongoose');

class PriceService {
    calculateFinalPrice(price, discountPercent) {
        if (!discountPercent || discountPercent <= 0) return price;
        const discount = (price * discountPercent) / 100;
        return Math.round((price - discount) * 100) / 100;
    }

    formatPriceData(price, discountPercent, finalPrice) {
        const result = {};

        if (price !== null && price !== undefined) {
            result.price = mongoose.Types.Decimal128.fromString(parseFloat(price).toString());
        }

        if (discountPercent !== null && discountPercent !== undefined) {
            result.discountPercent = Number(discountPercent);
        }

        if (finalPrice !== null && finalPrice !== undefined) {
            result.finalPrice = mongoose.Types.Decimal128.fromString(finalPrice.toString());
        }

        return result;
    }

    calculateUpdatedPricing(product, updateData) {
        const price = updateData.price
            ? parseFloat(updateData.price)
            : parseFloat(product.price.toString());
        const discountPercent = updateData.discountPercent !== undefined
            ? Number(updateData.discountPercent)
            : (product.discountPercent || 0);

        const finalPrice = this.calculateFinalPrice(price, discountPercent);

        return this.formatPriceData(
            updateData.price ? price : null,
            discountPercent,
            finalPrice
        );
    }
}

// Export the class as a constructor
module.exports = PriceService;