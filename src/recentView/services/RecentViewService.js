const RecentView = require('../data/models/RecentViewModel');

class RecentViewService {
    async saveRecentView({ userId = null, guestId = null, productId }) {
        if (!productId) throw new Error('Product ID is required');
        if (!userId && !guestId) throw new Error('Either userId or guestId must be provided');

        const viewData = {
            productId,
            viewedAt: new Date(),
            userId,
            guestId,
        };

        return await new RecentView(viewData).save();
    }

    async getRecentViews({ userId = null, guestId = null, limit = 10 }) {
        if (!userId && !guestId) throw new Error('Either userId or guestId must be provided');

        const filter = userId ? { userId } : { guestId };

        const result = await RecentView.find(filter)
            .sort({ viewedAt: -1 })
            .limit(limit)
            .populate('productId');


        return result;
    }

    async mergeGuestRecentViewsWithUser(guestId, userId) {
        if (!guestId || !userId) return;

        const guestViews = await RecentView.find({ guestId });

        for (const view of guestViews) {
            const existing = await RecentView.findOne({
                userId,
                productId: view.productId,
            });

            if (!existing) {
                const newView = new RecentView({
                    userId,
                    productId: view.productId,
                    viewedAt: view.viewedAt,
                });
                await newView.save();
            }
        }

        await RecentView.deleteMany({ guestId });
    }
}

module.exports = new RecentViewService();
