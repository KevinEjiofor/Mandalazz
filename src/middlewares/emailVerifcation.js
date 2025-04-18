import {sendErrorResponse} from "../utils/respondHandler";
import User from "../user/data/models/userModel";

const requireEmailVerification = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user. emailVerified) {
            return sendErrorResponse(res, 'Email not verified', 403);
        }

        next();
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};