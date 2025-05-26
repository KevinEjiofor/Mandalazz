const recentViewService = require('../services/RecentViewService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/respondHandler'); // adjust path as needed

class RecentViewController {
    async addRecentView(req, res) {
        try {
            const { productId } = req.body;
            const userId = req.user?._id || null;
            const guestId = !req.user ? (req.guestId || req.session?.guestId || req.headers['x-guest-id']) : null;

            if (!userId && !guestId) {
                return sendErrorResponse(res, 'Either user must be logged in or guest ID must be provided');
            }

            const recentView = await recentViewService.saveRecentView({ userId, guestId, productId });

            return sendSuccessResponse(res, 'Recent view saved', recentView);
        } catch (error) {

            return sendErrorResponse(res, error.message);
        }
    }

    async fetchRecentViews(req, res) {
        try {
            const userId = req.user?._id || null;
            const guestId = !req.user ? (req.guestId || req.session?.guestId || req.headers['x-guest-id']) : null;

            if (!userId && !guestId) {
                return sendErrorResponse(res, 'Either user must be logged in or guest ID must be provided');
            }

            const recentViews = await recentViewService.getRecentViews({ userId, guestId });

            return sendSuccessResponse(res, 'Recent views retrieved', recentViews);
        } catch (error) {
            // console.error('Error fetching recent views:', error);
            return sendErrorResponse(res, error.message);
        }
    }
}

module.exports = new RecentViewController();
